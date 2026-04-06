import { NextRequest, NextResponse } from "next/server";
import { processWebhookEvent } from "@/lib/channels/sync";

// WhatsApp message webhook — receives messages from any WhatsApp provider/gateway.
// Auth: Bearer token (OPENCLAW_API_TOKEN) or configurable.
export async function POST(req: NextRequest) {
  try {
    // Verify auth token
    const auth = req.headers.get("authorization");
    const token = process.env.OPENCLAW_API_TOKEN;
    if (token && auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();

    // Extract a unique event ID for deduplication
    const externalEventId = (payload.messageId || payload.message_id || payload.id) as string | undefined;
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    // Process the webhook event
    await processWebhookEvent("whatsapp", payload, headers, externalEventId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
