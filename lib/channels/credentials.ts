// ─── Provider Credential Resolver ────────────────────────────────────────────
// Reads app-level OAuth credentials from DB, falling back to env vars.

import { createClient } from "@/lib/supabase/server";
import type { ChannelProvider } from "./types";

export async function getProviderCredentials(provider: ChannelProvider): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("channel_provider_configs")
    .select("config_encrypted")
    .eq("provider", provider)
    .maybeSingle();

  const db = (data?.config_encrypted || {}) as Record<string, string>;

  // Merge: DB takes precedence over env vars
  if (provider === "gmail") {
    return {
      client_id: db.client_id || process.env.GOOGLE_CLIENT_ID || "",
      client_secret: db.client_secret || process.env.GOOGLE_CLIENT_SECRET || "",
    };
  }
  if (provider === "slack") {
    return {
      client_id: db.client_id || process.env.SLACK_CLIENT_ID || "",
      client_secret: db.client_secret || process.env.SLACK_CLIENT_SECRET || "",
      signing_secret: db.signing_secret || process.env.SLACK_SIGNING_SECRET || "",
    };
  }
  // whatsapp
  return {
    business_number: db.business_number || process.env.WHATSAPP_BUSINESS_NUMBER || "",
  };
}
