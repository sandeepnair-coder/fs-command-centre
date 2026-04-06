// ─── Provider Credential Resolver ────────────────────────────────────────────
// Reads app-level OAuth credentials from DB (channel_provider_configs),
// falling back to env vars for backwards compatibility.

import { createClient } from "@/lib/supabase/server";
import type { ChannelProvider } from "@/lib/types/channels";

type GmailCreds = { client_id: string; client_secret: string };
type SlackCreds = { client_id: string; client_secret: string; signing_secret?: string };

const cache = new Map<string, { data: Record<string, string>; ts: number }>();
const CACHE_TTL = 60_000; // 1 minute

async function getFromDb(provider: ChannelProvider): Promise<Record<string, string>> {
  const cached = cache.get(provider);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const supabase = await createClient();
  const { data } = await supabase
    .from("channel_provider_configs")
    .select("config_encrypted")
    .eq("provider", provider)
    .maybeSingle();

  const result = (data?.config_encrypted || {}) as Record<string, string>;
  cache.set(provider, { data: result, ts: Date.now() });
  return result;
}

export async function getGmailCredentials(): Promise<GmailCreds> {
  const db = await getFromDb("gmail");
  return {
    client_id: db.client_id || process.env.GOOGLE_CLIENT_ID || "",
    client_secret: db.client_secret || process.env.GOOGLE_CLIENT_SECRET || "",
  };
}

export async function getSlackCredentials(): Promise<SlackCreds> {
  const db = await getFromDb("slack");
  return {
    client_id: db.client_id || process.env.SLACK_CLIENT_ID || "",
    client_secret: db.client_secret || process.env.SLACK_CLIENT_SECRET || "",
    signing_secret: db.signing_secret || process.env.SLACK_SIGNING_SECRET || "",
  };
}

export async function getWhatsAppConfig(): Promise<{ business_number: string }> {
  const db = await getFromDb("whatsapp");
  return {
    business_number: db.business_number || process.env.WHATSAPP_BUSINESS_NUMBER || "",
  };
}

/** Invalidate cache when credentials are updated */
export function invalidateCredentialsCache(provider?: ChannelProvider) {
  if (provider) cache.delete(provider);
  else cache.clear();
}
