// ─── WhatsApp Provider Adapter (Meta Cloud API) ─────────────────────────────
// Webhook-driven message ingestion from Meta WhatsApp Business Platform.
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components

import type { ChannelAdapter, NormalizedMessage, NormalizedConversation, ProviderSource } from "./types";
import { getProviderCredentials } from "./credentials";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  // Meta sends numbers without + prefix
  return `+${digits}`;
}

export const whatsappAdapter: ChannelAdapter = {
  provider: "whatsapp",

  getOAuthUrl() { throw new Error("WhatsApp uses Meta webhook setup, not OAuth"); },
  async handleOAuthCallback() { throw new Error("WhatsApp uses Meta webhook setup, not OAuth"); },
  async refreshAccessToken() { throw new Error("WhatsApp tokens are managed via Meta developer portal"); },

  async listSources() {
    const creds = await getProviderCredentials("whatsapp");
    const number = creds.business_number || "not configured";
    return [{ external_id: normalizePhone(number), name: `WhatsApp (${number})`, source_type: "number" }];
  },

  async backfill() {
    // WhatsApp Cloud API doesn't support historical backfill
    return { messagesCount: 0 };
  },

  async syncIncremental() {
    // Real-time only via webhooks
    return { cursor: new Date().toISOString(), messagesCount: 0 };
  },

  async handleWebhook(payload) {
    // Skip status-only events
    if (payload.object === "whatsapp_status") return null;

    const from = payload.from as string;
    const body = (payload.body || "") as string;
    const msgId = payload.messageId as string;
    const contactName = (payload.contactName || from) as string;
    const timestamp = (payload.timestamp || new Date().toISOString()) as string;
    const direction = (payload.direction || "inbound") as string;

    if (!from || !msgId) return null;
    // Skip empty text messages (reactions, unsupported types)
    if (!body && !payload.hasMedia) return null;

    const normalizedFrom = normalizePhone(from);
    const threadId = `wa:${normalizedFrom}`;
    const sentAt = new Date(timestamp).toISOString();
    const isOutbound = direction === "outbound";
    const preview = body.slice(0, 150) || (payload.hasMedia ? "[Media]" : "");

    const message: NormalizedMessage = {
      external_message_id: msgId,
      external_thread_id: threadId,
      channel: "whatsapp",
      direction: isOutbound ? "outbound" : "inbound",
      sender_display_name: isOutbound ? "You" : contactName,
      sender_identifier: normalizedFrom,
      recipient_identifiers: [],
      body_text: body || (payload.hasMedia ? "[Media message]" : ""),
      body_html: null,
      has_attachments: !!(payload.hasMedia),
      source_url: null,
      sent_at: sentAt,
      received_at: sentAt,
      raw_payload: payload,
      attachments: payload.media ? [{
        external_attachment_id: (payload.media as Record<string, unknown>).id as string || null,
        file_name: ((payload.media as Record<string, unknown>).filename as string) || "media",
        mime_type: ((payload.media as Record<string, unknown>).mime_type as string) || null,
        file_size: null,
        external_url: null,
      }] : [],
    };

    const conversation: NormalizedConversation = {
      external_thread_id: threadId,
      channel: "whatsapp",
      subject: `WhatsApp \u2014 ${contactName}`,
      preview_text: preview,
      participants: [normalizedFrom],
      participants_summary: contactName,
      last_message_at: sentAt,
      source_url: null,
    };

    return { messages: [message], conversations: [conversation] };
  },
};
