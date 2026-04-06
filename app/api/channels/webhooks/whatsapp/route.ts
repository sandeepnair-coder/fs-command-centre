import { NextRequest, NextResponse } from "next/server";
import { processWebhookEvent } from "@/lib/channels/sync";
import { getProviderCredentials } from "@/lib/channels/credentials";

// ─── GET: Meta Webhook Verification ─────────────────────────────────────────
// Meta sends a GET request to verify the webhook URL during setup.
// https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Check verify token from DB or env
  const creds = await getProviderCredentials("whatsapp");
  const verifyToken = creds.verify_token || process.env.WHATSAPP_VERIFY_TOKEN || "";

  if (token !== verifyToken) {
    return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
  }

  // Return the challenge to confirm subscription
  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

// ─── POST: Meta WhatsApp Webhook Events ─────────────────────────────────────
// Receives message events from Meta WhatsApp Cloud API.
// Payload format: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Meta sends { object: "whatsapp_business_account", entry: [...] }
    if (payload.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: true }); // Ack but ignore non-WA events
    }

    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    // Process each entry
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;
        const value = change.value;
        if (!value) continue;

        const metadata = value.metadata || {};
        const contacts = value.contacts || [];
        const messages = value.messages || [];
        const statuses = value.statuses || [];

        // Process inbound messages
        for (const msg of messages) {
          const contact = contacts.find((c: { wa_id: string }) => c.wa_id === msg.from) || {};
          const contactName = contact.profile?.name || msg.from;

          const normalized = {
            object: "whatsapp_business_account",
            from: msg.from,
            body: msg.text?.body || msg.caption || "",
            messageId: msg.id,
            contactName,
            timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
            type: msg.type,
            direction: "inbound",
            display_phone_number: metadata.display_phone_number,
            phone_number_id: metadata.phone_number_id,
            // Media handling
            hasMedia: msg.type !== "text" && msg.type !== "reaction" && msg.type !== "unsupported",
            media: msg.image || msg.video || msg.audio || msg.document || null,
          };

          await processWebhookEvent("whatsapp", normalized, headers, msg.id);
        }

        // Process outbound status updates (sent/delivered/read)
        for (const status of statuses) {
          if (status.status === "sent" || status.status === "delivered") {
            // We could track delivery status here if needed
            // For v1, we just log it
            const normalized = {
              object: "whatsapp_status",
              messageId: status.id,
              status: status.status,
              recipientId: status.recipient_id,
              timestamp: new Date(parseInt(status.timestamp) * 1000).toISOString(),
              direction: "outbound",
            };
            // Log but don't create messages for status updates
            await processWebhookEvent("whatsapp", normalized, headers, `status-${status.id}-${status.status}`);
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WhatsApp Meta webhook error:", err);
    // Always return 200 to prevent Meta from retrying
    return NextResponse.json({ ok: true });
  }
}
