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

    const adapter = getAdapter("slack");
    const redirectUri = `${req.nextUrl.origin}/api/channels/slack/callback`;
    const result = await adapter.handleOAuthCallback(code, redirectUri);

    const supabase = await createClient();

    const { data: connection, error: dbErr } = await supabase
      .from("channel_connections")
      .upsert({
        provider: "slack",
        display_name: result.account_display_name,
        status: "connected",
        credentials_encrypted: { access_token: result.access_token },
        provider_account_id: result.account_id,
        provider_metadata: result.metadata || {},
        sync_health: "healthy",
        connected_by: member.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider,provider_account_id" })
      .select()
      .single();

    if (dbErr) throw dbErr;

    // Audit log
    await supabase.from("audit_log_events").insert({
      actor_type: "user",
      actor_id: member.id,
      event_type: "channel_connected",
      entity_type: "channel_connection",
      entity_id: connection?.id || "unknown",
      metadata_json: JSON.stringify({ provider: "slack", team: result.account_display_name }),
    });

    return NextResponse.redirect(new URL(`/settings/integrations?connected=slack`, req.url));
  } catch (err) {
    console.error("Slack OAuth callback error:", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(new URL(`/settings/integrations?error=${encodeURIComponent(msg)}`, req.url));
  }
}
