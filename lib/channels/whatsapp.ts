// ─── WhatsApp Provider Adapter ───────────────────────────────────────────────
// Reuses the existing OpenClaw gateway path for WhatsApp message ingestion.
// WhatsApp messages arrive via OpenClaw WS → API routes → this adapter normalizes them.

import type {
  ChannelAdapter,
  OAuthCallbackResult,
  ProviderSource,
  NormalizedMessage,
  NormalizedConversation,
  ChannelSource,
} from "@/lib/types/channels";

function normalizePhone(raw: string): string {
  // Strip everything except digits and leading +
  const digits = raw.replace(/[^\d+]/g, "");
  // Ensure E.164 format
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("91") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`; // Default India
  return `+${digits}`;
}

export const whatsappAdapter: ChannelAdapter = {
  provider: "whatsapp",

  getOAuthUrl(): string {
    // WhatsApp uses the existing OpenClaw provider path, no OAuth needed
    throw new Error("WhatsApp connects via OpenClaw gateway — no OAuth flow required");
  },

  async handleOAuthCallback(): Promise<OAuthCallbackResult> {
    throw new Error("WhatsApp connects via OpenClaw gateway — no OAuth flow required");
  },

  async refreshToken() {
    throw new Error("WhatsApp tokens are managed by OpenClaw");
  },

  async listSources(): Promise<ProviderSource[]> {
    // WhatsApp has a single "number" source — the configured business number
    const number = process.env.WHATSAPP_BUSINESS_NUMBER || "unknown";
    return [
      {
        external_id: normalizePhone(number),
        name: `WhatsApp Business (${number})`,
        source_type: "number",
        metadata: { provider: "openclaw" },
      },
    ];
  },

  async backfill(_accessToken, _since, _sources, _onBatch) {
    // WhatsApp doesn't support historical backfill via API
    // Messages are ingested in real-time via OpenClaw webhooks
    return { messagesCount: 0 };
  },

  async syncIncremental(_accessToken, _cursor, _sources, _onBatch) {
    // WhatsApp syncs happen via webhook/OpenClaw events, not polling
    return { cursor: new Date().toISOString(), messagesCount: 0 };
  },

  async handleWebhook(payload) {
    // Normalize incoming OpenClaw WhatsApp message payloads
    // Expected shape from OpenClaw: { from, to, body, timestamp, messageId, ... }
    const from = payload.from as string;
    const to = payload.to as string;
    const body = payload.body as string || payload.text as string || "";
    const timestamp = payload.timestamp as string || new Date().toISOString();
    const messageId = payload.messageId as string || payload.message_id as string;
    const contactName = payload.contactName as string || payload.contact_name as string || from;

    if (!from || !messageId) return null;

    const normalizedFrom = normalizePhone(from);
    const normalizedTo = to ? normalizePhone(to) : "business";
    const threadId = `wa:${normalizedFrom}`;

    const msg: NormalizedMessage = {
      external_message_id: messageId,
      external_thread_id: threadId,
      channel: "whatsapp",
      sender_display_name: contactName,
      sender_identifier: normalizedFrom,
      body_text: body,
      body_html: null,
      has_attachments: !!(payload.hasMedia || payload.has_media),
      is_from_client: normalizedFrom !== normalizedTo,
      in_reply_to: (payload.quotedMessageId as string) || null,
      source_url: null,
      created_at: timestamp,
      raw_payload: payload,
      attachments: payload.media
        ? [
            {
              file_name: (payload.media as Record<string, unknown>).filename as string || "media",
              mime_type: (payload.media as Record<string, unknown>).mimetype as string || null,
              size_bytes: null,
              external_url: (payload.media as Record<string, unknown>).url as string || null,
              provider_file_id: null,
            },
          ]
        : [],
    };

    const convo: NormalizedConversation = {
      external_thread_id: threadId,
      channel: "whatsapp",
      subject: `WhatsApp — ${contactName}`,
      participants: [normalizedFrom],
      last_message_at: timestamp,
      source_url: null,
    };

    return { messages: [msg], conversations: [convo] };
  },
};
