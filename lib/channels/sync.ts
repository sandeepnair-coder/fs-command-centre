// ─── Sync Engine ─────────────────────────────────────────────────────────────
// Persists normalized messages/conversations to DB. Handles backfill,
// incremental sync, and webhook event processing. No AI dependencies.

import { createClient } from "@/lib/supabase/server";
import { getAdapter } from "./index";
import type { ChannelProvider, NormalizedMessage, NormalizedConversation } from "./types";

// ─── Token Management ───────────────────────────────────────────────────────

export async function getAccessToken(connectionId: string): Promise<string> {
  const supabase = await createClient();
  const { data: conn } = await supabase.from("channel_connections").select("*").eq("id", connectionId).single();
  if (!conn) throw new Error("Connection not found");

  const creds = conn.credentials_encrypted as Record<string, string> | null;
  if (!creds?.access_token) throw new Error("No credentials");

  // Check expiry
  if (conn.token_expires_at) {
    const expiry = new Date(conn.token_expires_at).getTime();
    if (expiry - 5 * 60 * 1000 < Date.now() && conn.refresh_token_encrypted) {
      const adapter = getAdapter(conn.provider as ChannelProvider);
      const refreshed = await adapter.refreshAccessToken(conn.refresh_token_encrypted);
      await supabase.from("channel_connections").update({
        credentials_encrypted: { ...creds, access_token: refreshed.access_token },
        token_expires_at: refreshed.expires_at || null,
        updated_at: new Date().toISOString(),
      }).eq("id", connectionId);
      return refreshed.access_token;
    }
  }

  return creds.access_token;
}

// ─── Persist Normalized Data ────────────────────────────────────────────────

export async function persistBatch(
  connectionId: string,
  channel: "email" | "slack" | "whatsapp",
  messages: NormalizedMessage[],
  conversations: NormalizedConversation[],
): Promise<{ messagesInserted: number; conversationsUpserted: number }> {
  const supabase = await createClient();
  let messagesInserted = 0;
  let conversationsUpserted = 0;

  // 1. Upsert conversations
  for (const convo of conversations) {
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("channel", channel)
      .eq("external_thread_id", convo.external_thread_id)
      .maybeSingle();

    if (existing) {
      await supabase.from("conversations").update({
        last_message_at: convo.last_message_at,
        preview_text: convo.preview_text,
        participants: convo.participants,
        participants_summary: convo.participants_summary,
        subject: convo.subject || undefined,
        source_url: convo.source_url || undefined,
        is_synced: true,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      const { error } = await supabase.from("conversations").insert({
        channel,
        channel_connection_id: connectionId,
        external_thread_id: convo.external_thread_id,
        subject: convo.subject,
        preview_text: convo.preview_text,
        participants: convo.participants,
        participants_summary: convo.participants_summary,
        last_message_at: convo.last_message_at,
        source_url: convo.source_url,
        is_synced: true,
        last_synced_at: new Date().toISOString(),
        status: "open",
        priority: "normal",
        relationship_health: "active",
        is_resolved: false,
        unread_count: 0,
        message_count: 0,
        extracted_asks: [],
        extracted_decisions: [],
        extracted_deadlines: [],
      });
      if (!error) conversationsUpserted++;
    }
  }

  // 2. Insert messages (idempotent via external_message_id check)
  for (const msg of messages) {
    const { data: convo } = await supabase
      .from("conversations")
      .select("id")
      .eq("channel", channel)
      .eq("external_thread_id", msg.external_thread_id)
      .maybeSingle();
    if (!convo) continue;

    // Check for duplicate
    const { data: existing } = await supabase
      .from("comms_messages")
      .select("id")
      .eq("external_message_id", msg.external_message_id)
      .eq("conversation_id", convo.id)
      .maybeSingle();
    if (existing) continue;

    const { error } = await supabase.from("comms_messages").insert({
      conversation_id: convo.id,
      channel,
      channel_connection_id: connectionId,
      external_message_id: msg.external_message_id,
      direction: msg.direction,
      sender_display_name: msg.sender_display_name,
      sender_identifier: msg.sender_identifier,
      recipient_identifiers: msg.recipient_identifiers,
      body_text: msg.body_text,
      body_html: msg.body_html,
      has_attachments: msg.has_attachments,
      is_from_client: msg.direction === "inbound",
      source_url: msg.source_url,
      sent_at: msg.sent_at,
      received_at: msg.received_at,
      synced_at: new Date().toISOString(),
      created_at: msg.sent_at,
    });

    if (!error) {
      messagesInserted++;

      // Update conversation counts
      const { count } = await supabase
        .from("comms_messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", convo.id);

      await supabase.from("conversations").update({
        message_count: count || 0,
        preview_text: msg.body_text.slice(0, 150),
        last_message_at: msg.sent_at,
        updated_at: new Date().toISOString(),
      }).eq("id", convo.id);
    }
  }

  return { messagesInserted, conversationsUpserted };
}

// ─── Run Backfill ───────────────────────────────────────────────────────────

export async function runBackfill(connectionId: string) {
  const supabase = await createClient();
  const { data: conn } = await supabase.from("channel_connections").select("*").eq("id", connectionId).single();
  if (!conn) throw new Error("Connection not found");

  const { data: sources } = await supabase.from("channel_sources").select("*").eq("channel_connection_id", connectionId).eq("is_enabled", true);

  // Create sync job
  const { data: job } = await supabase.from("sync_jobs").insert({
    channel_connection_id: connectionId, job_type: "backfill", status: "running", started_at: new Date().toISOString(),
  }).select().single();

  await supabase.from("channel_connections").update({
    status: "syncing", sync_health: "syncing", updated_at: new Date().toISOString(),
  }).eq("id", connectionId);

  const provider = conn.provider as ChannelProvider;
  const adapter = getAdapter(provider);
  const channel = provider === "gmail" ? "email" : provider;

  try {
    const token = await getAccessToken(connectionId);
    const since = new Date(Date.now() - (conn.backfill_days || 30) * 86400000);
    let total = 0;

    const result = await adapter.backfill(
      token, since,
      (sources || []).map((s) => ({ external_id: s.external_id, is_enabled: s.is_enabled })),
      async (msgs, convos) => {
        const batch = await persistBatch(connectionId, channel as "email" | "slack" | "whatsapp", msgs, convos);
        total += batch.messagesInserted;
        if (job) await supabase.from("sync_jobs").update({ messages_processed: total }).eq("id", job.id);
      },
    );

    if (result.cursor) {
      await supabase.from("sync_cursors").upsert({
        channel_connection_id: connectionId,
        cursor_type: provider === "gmail" ? "history_id" : "timestamp",
        cursor_value: result.cursor,
        updated_at: new Date().toISOString(),
      }, { onConflict: "channel_connection_id,cursor_type" });
    }

    await supabase.from("sync_jobs").update({ status: "completed", completed_at: new Date().toISOString(), messages_processed: total }).eq("id", job?.id);
    await supabase.from("channel_connections").update({
      status: "connected", sync_health: "healthy", last_sync_at: new Date().toISOString(), last_sync_status: "success",
      messages_synced_count: (conn.messages_synced_count || 0) + total, updated_at: new Date().toISOString(),
    }).eq("id", connectionId);

    await supabase.from("audit_log_events").insert({ actor_type: "system", event_type: "backfill_completed", entity_type: "channel_connection", entity_id: connectionId, metadata_json: JSON.stringify({ messages: total, provider }) });

    return { messagesCount: total };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await supabase.from("sync_jobs").update({ status: "failed", completed_at: new Date().toISOString(), last_error: msg }).eq("id", job?.id);
    await supabase.from("channel_connections").update({ status: "error", sync_health: "error", last_error: msg, last_sync_status: "error", updated_at: new Date().toISOString() }).eq("id", connectionId);
    throw err;
  }
}

// ─── Run Incremental Sync ───────────────────────────────────────────────────

export async function runIncrementalSync(connectionId: string) {
  const supabase = await createClient();
  const { data: conn } = await supabase.from("channel_connections").select("*").eq("id", connectionId).single();
  if (!conn) throw new Error("Connection not found");

  const provider = conn.provider as ChannelProvider;
  const adapter = getAdapter(provider);
  const channel = provider === "gmail" ? "email" : provider;

  const { data: cursorRow } = await supabase.from("sync_cursors").select("cursor_value").eq("channel_connection_id", connectionId).maybeSingle();
  const { data: sources } = await supabase.from("channel_sources").select("*").eq("channel_connection_id", connectionId).eq("is_enabled", true);

  const token = await getAccessToken(connectionId);
  let total = 0;

  const result = await adapter.syncIncremental(
    token, cursorRow?.cursor_value || null,
    (sources || []).map((s) => ({ external_id: s.external_id, is_enabled: s.is_enabled })),
    async (msgs, convos) => {
      const batch = await persistBatch(connectionId, channel as "email" | "slack" | "whatsapp", msgs, convos);
      total += batch.messagesInserted;
    },
  );

  if (result.cursor) {
    await supabase.from("sync_cursors").upsert({
      channel_connection_id: connectionId,
      cursor_type: provider === "gmail" ? "history_id" : "timestamp",
      cursor_value: result.cursor,
      updated_at: new Date().toISOString(),
    }, { onConflict: "channel_connection_id,cursor_type" });
  }

  await supabase.from("channel_connections").update({
    last_sync_at: new Date().toISOString(), last_sync_status: "success", sync_health: "healthy",
    messages_synced_count: (conn.messages_synced_count || 0) + total, updated_at: new Date().toISOString(),
  }).eq("id", connectionId);

  return { messagesCount: total };
}

// ─── Process Webhook Event ──────────────────────────────────────────────────

export async function processWebhookEvent(
  provider: ChannelProvider,
  payload: Record<string, unknown>,
  headers: Record<string, string>,
  externalEventId?: string,
) {
  const supabase = await createClient();

  // Dedupe check
  if (externalEventId) {
    const { data: existing } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("provider", provider)
      .eq("external_event_id", externalEventId)
      .maybeSingle();
    if (existing) return; // Already processed
  }

  // Log event
  const { data: event } = await supabase.from("webhook_events").insert({
    provider,
    event_type: (payload.type as string) || "message",
    external_event_id: externalEventId || null,
    payload,
    processing_status: "processing",
  }).select().single();

  try {
    const adapter = getAdapter(provider);
    const result = await adapter.handleWebhook(payload, headers);

    if (!result || (!result.messages.length && !result.conversations.length)) {
      await supabase.from("webhook_events").update({ processing_status: "ignored", processed_at: new Date().toISOString() }).eq("id", event?.id);
      return;
    }

    // Find active connection for this provider
    const { data: connections } = await supabase.from("channel_connections").select("id").eq("provider", provider).neq("status", "disconnected").limit(1);
    const connId = connections?.[0]?.id;
    if (!connId) {
      await supabase.from("webhook_events").update({ processing_status: "ignored", error: "No active connection", processed_at: new Date().toISOString() }).eq("id", event?.id);
      return;
    }

    const channel = provider === "gmail" ? "email" : provider;
    await persistBatch(connId, channel as "email" | "slack" | "whatsapp", result.messages, result.conversations);

    await supabase.from("webhook_events").update({ processing_status: "processed", channel_connection_id: connId, processed_at: new Date().toISOString() }).eq("id", event?.id);
  } catch (err) {
    await supabase.from("webhook_events").update({ processing_status: "failed", error: (err as Error).message, processed_at: new Date().toISOString() }).eq("id", event?.id);
  }
}
