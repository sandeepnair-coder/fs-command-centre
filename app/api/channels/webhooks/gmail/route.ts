import { NextRequest, NextResponse } from "next/server";
import { processWebhookEvent } from "@/lib/channels/sync";
import { runIncrementalSync } from "@/lib/channels/sync";
import { createClient } from "@/lib/supabase/server";

// Gmail Push Notifications via Google Cloud Pub/Sub
// The push payload contains a historyId — we use it to trigger incremental sync
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Extract historyId from Pub/Sub message
    const message = payload.message as { data?: string; messageId?: string } | undefined;
    if (!message?.data) return NextResponse.json({ ok: true }); // ack empty

    const decoded = JSON.parse(Buffer.from(message.data, "base64").toString("utf-8"));
    const historyId = decoded.historyId as string | undefined;
    const emailAddress = decoded.emailAddress as string | undefined;

    // Log the webhook event
    const supabase = await createClient();
    await supabase.from("webhook_events").insert({
      provider: "gmail",
      event_type: "push_notification",
      external_event_id: message.messageId || null,
      payload: { historyId, emailAddress },
      processing_status: "processing",
    });

    // Find the connection for this email and trigger incremental sync
    if (emailAddress) {
      const { data: conn } = await supabase
        .from("channel_connections")
        .select("id")
        .eq("provider", "gmail")
        .eq("provider_account_id", emailAddress)
        .neq("status", "disconnected")
        .maybeSingle();

      if (conn) {
        // Run sync in background
        runIncrementalSync(conn.id).catch((err) => console.error("Gmail incremental sync error:", err));
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Always 200 to prevent Pub/Sub retries
  }
}
