import { NextRequest, NextResponse } from "next/server";
import { ingestWhatsAppMessage } from "@/lib/channels/ingest";

// WhatsApp messages arrive via OpenClaw gateway or direct webhook
// This endpoint receives WhatsApp messages and writes them to Comms
export async function POST(req: NextRequest) {
  try {
    // Verify OpenClaw token
    const auth = req.headers.get("authorization");
    const token = process.env.OPENCLAW_API_TOKEN;
    if (token && auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();

    // Directly ingest into comms tables
    const result = await ingestWhatsAppMessage({
      from: payload.from || payload.sender,
      to: payload.to || payload.recipient,
      body: payload.body || payload.text || payload.message,
      contact_name: payload.contactName || payload.contact_name || payload.senderName,
      timestamp: payload.timestamp || payload.ts,
      message_id: payload.messageId || payload.message_id || payload.id || `wa-${Date.now()}`,
      channel: "whatsapp",
      has_media: payload.hasMedia || payload.has_media,
      media: payload.media,
      quoted_message_id: payload.quotedMessageId || payload.quoted_message_id,
      client_name: payload.clientName || payload.client_name,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
