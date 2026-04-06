// ─── WhatsApp Provider Adapter ───────────────────────────────────────────────
// Webhook-driven message ingestion. No OAuth — uses existing provider path.
// Messages arrive via POST to /api/channels/webhooks/whatsapp.

import type { ChannelAdapter, NormalizedMessage, NormalizedConversation, ProviderSource } from "./types";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("91") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

export const whatsappAdapter: ChannelAdapter = {
  provider: "whatsapp",

  getOAuthUrl() { throw new Error("WhatsApp does not use OAuth — connect via webhook config"); },
  async handleOAuthCallback() { throw new Error("WhatsApp does not use OAuth"); },
  async refreshAccessToken() { throw new Error("WhatsApp tokens managed externally"); },

  async listSources() {
    const number = process.env.WHATSAPP_BUSINESS_NUMBER || "unknown";
    return [{ external_id: normalizePhone(number), name: `WhatsApp (${number})`, source_type: "number" }];
  },

  async backfill() {
    // WhatsApp doesn't support historical backfill — inbound only via webhook
    return { messagesCount: 0 };
  },

  async syncIncremental() {
    return { cursor: new Date().toISOString(), messagesCount: 0 };
  },

  async handleWebhook(payload) {
    const from = (payload.from || payload.sender) as string;
    const body = (payload.body || payload.text || payload.message || "") as string;
    const msgId = (payload.messageId || payload.message_id || payload.id || `wa-${Date.now()}`) as string;
    const contactName = (payload.contactName || payload.contact_name || payload.senderName || from) as string;
    const timestamp = (payload.timestamp || payload.ts || new Date().toISOString()) as string;

    if (!from || !body) return null;

    const normalizedFrom = normalizePhone(from);
    const threadId = `wa:${normalizedFrom}`;
    const sentAt = new Date(timestamp).toISOString();
    const isOutbound = !!(payload.is_outbound || payload.direction === "outbound");

    const message: NormalizedMessage = {
      external_message_id: msgId,
      external_thread_id: threadId,
      channel: "whatsapp",
      direction: isOutbound ? "outbound" : "inbound",
      sender_display_name: contactName,
      sender_identifier: normalizedFrom,
      recipient_identifiers: [],
      body_text: body,
      body_html: null,
      has_attachments: !!(payload.hasMedia || payload.has_media),
      source_url: null,
      sent_at: sentAt,
      received_at: sentAt,
      raw_payload: payload,
      attachments: payload.media ? [{
        external_attachment_id: null,
        file_name: ((payload.media as Record<string, unknown>).filename as string) || "media",
        mime_type: ((payload.media as Record<string, unknown>).mimetype as string) || null,
        file_size: null,
        external_url: ((payload.media as Record<string, unknown>).url as string) || null,
      }] : [],
    };

    const conversation: NormalizedConversation = {
      external_thread_id: threadId,
      channel: "whatsapp",
      subject: `WhatsApp — ${contactName}`,
      preview_text: body.slice(0, 150),
      participants: [normalizedFrom],
      participants_summary: contactName,
      last_message_at: sentAt,
      source_url: null,
    };

    return { messages: [message], conversations: [conversation] };
  },
};
