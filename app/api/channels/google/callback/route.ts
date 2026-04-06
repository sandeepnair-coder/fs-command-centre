import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/channels";
import { getCurrentMember } from "@/lib/auth/getCurrentMember";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings/integrations?error=missing_params", req.url));
  }

  try {
    const member = await getCurrentMember();
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return NextResponse.redirect(new URL("/settings/integrations?error=unauthorized", req.url));
    }

    const adapter = getAdapter("gmail");
    const redirectUri = `${req.nextUrl.origin}/api/channels/google/callback`;
    const result = await adapter.handleOAuthCallback(code, redirectUri);

    const supabase = await createClient();

    // Create or update channel connection
    const { data: connection, error: dbErr } = await supabase
      .from("channel_connections")
      .upsert({
        provider: "gmail",
        display_name: result.display_name,
        status: "connected",
        credentials_encrypted: { access_token: result.access_token },
        token_expires_at: result.expires_at || null,
        refresh_token_encrypted: result.refresh_token || null,
        provider_account_id: result.account_id,
        provider_metadata: result.metadata || {},
        sync_health: "healthy",
        connected_by: member.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider,provider_account_id" })
      .select()
      .single();

    if (dbErr) throw dbErr;

    // Auto-create default sources (INBOX)
    if (connection) {
      await supabase.from("channel_sources").upsert({
        channel_connection_id: connection.id,
        source_type: "inbox",
        external_id: "INBOX",
        name: "Inbox",
        is_enabled: true,
      }, { onConflict: "channel_connection_id,external_id" });
    }

    // Audit log
    await supabase.from("audit_log_events").insert({
      actor_type: "user",
      actor_id: member.id,
      event_type: "channel_connected",
      entity_type: "channel_connection",
      entity_id: connection?.id || "unknown",
      metadata_json: JSON.stringify({ provider: "gmail", account: result.account_id }),
    });

    return NextResponse.redirect(new URL(`/settings/integrations?connected=gmail`, req.url));
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(new URL(`/settings/integrations?error=${encodeURIComponent(msg)}`, req.url));
  }
}
