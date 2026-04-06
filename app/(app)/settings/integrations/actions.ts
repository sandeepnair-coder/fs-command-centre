"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth/getCurrentMember";
import { getAdapter } from "@/lib/channels";
import { runBackfill, runIncrementalSync } from "@/lib/channels/sync";
import type {
  ChannelConnection,
  ChannelSource,
  ChannelProvider,
  SyncJob,
} from "@/lib/types/channels";

// ─── Provider Config (API credentials) ──────────────────────────────────────

export type ProviderConfigStatus = {
  provider: ChannelProvider;
  is_configured: boolean;
  /** Which fields are set (no values exposed to client) */
  fields_set: string[];
};

/**
 * Get the setup status for all providers — never exposes actual secrets.
 */
export async function getProviderConfigStatuses(): Promise<ProviderConfigStatus[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("channel_provider_configs")
    .select("provider, is_configured, config_encrypted")
    .order("provider");

  const allProviders: ChannelProvider[] = ["gmail", "slack", "whatsapp"];
  return allProviders.map((provider) => {
    const row = (data || []).find((d) => d.provider === provider);
    if (!row) return { provider, is_configured: false, fields_set: [] };
    const cfg = (row.config_encrypted || {}) as Record<string, string>;
    return {
      provider,
      is_configured: row.is_configured,
      fields_set: Object.keys(cfg).filter((k) => !!cfg[k]),
    };
  });
}

/**
 * Save provider-level API credentials (Client ID, Secret, etc.).
 * These are stored in channel_provider_configs and used by the adapters.
 */
export async function saveProviderConfig(
  provider: ChannelProvider,
  config: Record<string, string>,
) {
  const member = await getCurrentMember();
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    throw new Error("Only admins can configure integrations");
  }

  const supabase = await createClient();

  // Validate required fields per provider
  if (provider === "gmail") {
    if (!config.client_id?.trim() || !config.client_secret?.trim()) {
      throw new Error("Google Client ID and Client Secret are required");
    }
  } else if (provider === "slack") {
    if (!config.client_id?.trim() || !config.client_secret?.trim()) {
      throw new Error("Slack Client ID and Client Secret are required");
    }
  }
  // WhatsApp uses OpenClaw — no extra credentials needed

  const trimmed: Record<string, string> = {};
  for (const [k, v] of Object.entries(config)) {
    if (v?.trim()) trimmed[k] = v.trim();
  }

  const { error } = await supabase
    .from("channel_provider_configs")
    .upsert({
      provider,
      config_encrypted: trimmed,
      is_configured: true,
      configured_by: member.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider" });
  if (error) throw error;

  await supabase.from("audit_log_events").insert({
    actor_type: "user",
    actor_id: member.id,
    event_type: "provider_configured",
    entity_type: "channel_provider_config",
    entity_id: provider,
    metadata_json: JSON.stringify({ fields: Object.keys(trimmed) }),
  });
}

/**
 * Remove provider-level config (for re-setup).
 */
export async function clearProviderConfig(provider: ChannelProvider) {
  const member = await getCurrentMember();
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    throw new Error("Only admins can configure integrations");
  }

  const supabase = await createClient();
  await supabase
    .from("channel_provider_configs")
    .update({ config_encrypted: {}, is_configured: false, updated_at: new Date().toISOString() })
    .eq("provider", provider);
}

/**
 * Read the raw provider config from DB (server-side only, never exposed to client).
 */
export async function _getProviderCredentials(provider: ChannelProvider): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("channel_provider_configs")
    .select("config_encrypted")
    .eq("provider", provider)
    .maybeSingle();
  return (data?.config_encrypted || {}) as Record<string, string>;
}

// ─── Connections ────────────────────────────────────────────────────────────

export async function getChannelConnections() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channel_connections")
    .select("*")
    .order("provider");
  if (error) throw error;
  return (data || []).map((c) => ({
    ...c,
    credentials_encrypted: null,
    refresh_token_encrypted: null,
  })) as ChannelConnection[];
}

export async function getConnectionById(connectionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channel_connections")
    .select("*")
    .eq("id", connectionId)
    .single();
  if (error) throw error;
  return {
    ...data,
    credentials_encrypted: null,
    refresh_token_encrypted: null,
  } as ChannelConnection;
}

export async function disconnectChannel(connectionId: string) {
  const member = await getCurrentMember();
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    throw new Error("Only admins can disconnect channels");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("channel_connections")
    .update({
      status: "disconnected",
      sync_health: "unknown",
      credentials_encrypted: null,
      refresh_token_encrypted: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId);
  if (error) throw error;

  await supabase.from("audit_log_events").insert({
    actor_type: "user",
    actor_id: member.id,
    event_type: "channel_disconnected",
    entity_type: "channel_connection",
    entity_id: connectionId,
  });
}

export async function updateConnectionConfig(
  connectionId: string,
  updates: { backfill_days?: number; auto_link_enabled?: boolean },
) {
  const member = await getCurrentMember();
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    throw new Error("Only admins can update channel config");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channel_connections")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", connectionId)
    .select()
    .single();
  if (error) throw error;
  return { ...data, credentials_encrypted: null, refresh_token_encrypted: null } as ChannelConnection;
}

// ─── OAuth URL Generation ───────────────────────────────────────────────────

export async function getOAuthUrl(provider: ChannelProvider) {
  const member = await getCurrentMember();
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    throw new Error("Only admins can connect channels");
  }

  // Read credentials from DB
  const creds = await _getProviderCredentials(provider);
  if (!creds.client_id) {
    throw new Error(`${provider} is not configured. Save your API credentials first.`);
  }

  // Inject credentials into process.env so the adapter can read them synchronously
  // (getOAuthUrl is synchronous in the adapter interface)
  if (provider === "gmail") {
    process.env.GOOGLE_CLIENT_ID = creds.client_id;
    process.env.GOOGLE_CLIENT_SECRET = creds.client_secret;
  } else if (provider === "slack") {
    process.env.SLACK_CLIENT_ID = creds.client_id;
    process.env.SLACK_CLIENT_SECRET = creds.client_secret;
    if (creds.signing_secret) process.env.SLACK_SIGNING_SECRET = creds.signing_secret;
  }

  const adapter = getAdapter(provider);
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
  const redirectUri = `${origin}/api/channels/${provider === "gmail" ? "google" : provider}/callback`;
  const state = Buffer.from(JSON.stringify({ provider, member_id: member.id, ts: Date.now() })).toString("base64url");

  return adapter.getOAuthUrl(redirectUri, state);
}

// ─── WhatsApp Connection (via OpenClaw) ─────────────────────────────────────

export async function connectWhatsApp() {
  const member = await getCurrentMember();
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    throw new Error("Only admins can connect channels");
  }

  const supabase = await createClient();

  // Get number from provider config or env
  const waConfig = await _getProviderCredentials("whatsapp");
  const number = waConfig.business_number || process.env.WHATSAPP_BUSINESS_NUMBER || "";
  if (!number) throw new Error("No WhatsApp business number configured");

  const { data, error } = await supabase
    .from("channel_connections")
    .upsert({
      provider: "whatsapp",
      display_name: `WhatsApp Business (${number})`,
      status: "connected",
      provider_account_id: number,
      provider_metadata: { via: "openclaw", number },
      sync_health: "healthy",
      connected_by: member.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider,provider_account_id" })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("channel_sources").upsert({
    channel_connection_id: data.id,
    source_type: "number",
    external_id: number,
    name: `WhatsApp (${number})`,
    is_enabled: true,
  }, { onConflict: "channel_connection_id,external_id" });

  await supabase.from("audit_log_events").insert({
    actor_type: "user",
    actor_id: member.id,
    event_type: "channel_connected",
    entity_type: "channel_connection",
    entity_id: data.id,
    metadata_json: JSON.stringify({ provider: "whatsapp", number }),
  });

  return { ...data, credentials_encrypted: null, refresh_token_encrypted: null } as ChannelConnection;
}

// ─── Sources ────────────────────────────────────────────────────────────────

export async function getChannelSources(connectionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channel_sources")
    .select("*")
    .eq("channel_connection_id", connectionId)
    .order("name");
  if (error) throw error;
  return data as ChannelSource[];
}

export async function refreshAvailableSources(connectionId: string) {
  const member = await getCurrentMember();
  if (!member) throw new Error("Not authenticated");

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("channel_connections")
    .select("*")
    .eq("id", connectionId)
    .single();
  if (!connection) throw new Error("Connection not found");

  const conn = connection as ChannelConnection;
  const adapter = getAdapter(conn.provider);
  const creds = connection.credentials_encrypted as Record<string, string>;
  if (!creds?.access_token) throw new Error("No credentials");

  const sources = await adapter.listSources(creds.access_token, conn.provider_metadata);

  for (const source of sources) {
    await supabase.from("channel_sources").upsert({
      channel_connection_id: connectionId,
      source_type: source.source_type,
      external_id: source.external_id,
      name: source.name,
      metadata: source.metadata || {},
    }, { onConflict: "channel_connection_id,external_id" });
  }

  return getChannelSources(connectionId);
}

export async function toggleSource(sourceId: string, enabled: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("channel_sources")
    .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", sourceId);
  if (error) throw error;
}

export async function mapSourceToClient(sourceId: string, clientId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("channel_sources")
    .update({ client_id: clientId, updated_at: new Date().toISOString() })
    .eq("id", sourceId);
  if (error) throw error;
}

// ─── Sync Operations ────────────────────────────────────────────────────────

export async function triggerBackfill(connectionId: string) {
  const member = await getCurrentMember();
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    throw new Error("Only admins can trigger backfill");
  }

  runBackfill(connectionId).catch((err) => {
    console.error("Backfill error:", err);
  });

  return { started: true };
}

export async function triggerSync(connectionId: string) {
  runIncrementalSync(connectionId).catch((err) => {
    console.error("Sync error:", err);
  });
  return { started: true };
}

export async function getSyncJobs(connectionId: string, limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sync_jobs")
    .select("*")
    .eq("channel_connection_id", connectionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as SyncJob[];
}

// ─── Webhook Events ─────────────────────────────────────────────────────────

export async function getRecentWebhookEvents(provider?: ChannelProvider, limit = 20) {
  const supabase = await createClient();
  let query = supabase
    .from("webhook_events")
    .select("id, provider, event_type, processing_status, error, created_at, processed_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (provider) query = query.eq("provider", provider);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
