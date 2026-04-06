// ─── Direct Message Ingestion ────────────────────────────────────────────────
// Ingests raw WhatsApp/channel messages into the Comms system.
// Called by: /api/v1/ingest-message, /api/channels/webhooks/whatsapp,
// and bridged from existing v1 API routes when source_channel is set.

import { createClient } from "@/lib/supabase/server";
import type { ChannelType } from "@/lib/types/comms";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("91") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

type IngestInput = {
  from: string;
  to?: string;
  body?: string;
  text?: string;
  contact_name?: string;
  timestamp?: string;
  message_id: string;
  channel?: string;
  has_media?: boolean;
  media?: { filename?: string; mimetype?: string; url?: string };
  quoted_message_id?: string;
  client_name?: string;
  client_id?: string;
};

export async function ingestWhatsAppMessage(input: IngestInput) {
  const supabase = await createClient();

  const channel: ChannelType = (input.channel as ChannelType) || "whatsapp";
  const messageText = input.body || input.text || "";
  const timestamp = input.timestamp || new Date().toISOString();
  const senderDisplay = input.contact_name || input.from;

  const normalizedFrom = channel === "whatsapp" ? normalizePhone(input.from) : input.from;
  const threadId = channel === "whatsapp"
    ? `wa:${normalizedFrom}`
    : `${channel}:${normalizedFrom}`;

  // ─── Find or get WhatsApp connection ──────────────────────────────────────
  const { data: connection } = await supabase
    .from("channel_connections")
    .select("id")
    .eq("provider", channel === "email" ? "gmail" : channel)
    .neq("status", "disconnected")
    .limit(1)
    .maybeSingle();

  const connectionId = connection?.id || null;

  // ─── Resolve client ───────────────────────────────────────────────────────
  let clientId = input.client_id || null;

  // Try by client_name
  if (!clientId && input.client_name) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .ilike("name", `%${input.client_name}%`)
      .limit(1)
      .maybeSingle();
    clientId = client?.id || null;
  }

  // Try by phone match
  if (!clientId && channel === "whatsapp") {
    const { data: contact } = await supabase
      .from("client_contacts")
      .select("client_id")
      .eq("phone", normalizedFrom)
      .limit(1)
      .maybeSingle();
    clientId = contact?.client_id || null;

    if (!clientId) {
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", normalizedFrom)
        .limit(1)
        .maybeSingle();
      clientId = client?.id || null;
    }
  }

  // Try by email match
  if (!clientId && channel === "email") {
    const { data: contact } = await supabase
      .from("client_contacts")
      .select("client_id")
      .ilike("email", normalizedFrom)
      .limit(1)
      .maybeSingle();
    clientId = contact?.client_id || null;
  }

  // ─── Upsert conversation ─────────────────────────────────────────────────
  let conversationId: string;

  const { data: existingConvo } = await supabase
    .from("conversations")
    .select("id")
    .eq("external_thread_id", threadId)
    .eq("channel", channel)
    .maybeSingle();

  if (existingConvo) {
    conversationId = existingConvo.id;
    await supabase.from("conversations").update({
      last_message_at: timestamp,
      client_id: clientId || undefined, // only update if we have one
      updated_at: new Date().toISOString(),
      is_synced: true,
      last_synced_at: new Date().toISOString(),
    }).eq("id", conversationId);
  } else {
    const subject = channel === "whatsapp"
      ? `WhatsApp — ${senderDisplay}`
      : `${channel} — ${senderDisplay}`;

    const { data: newConvo, error: convoErr } = await supabase
      .from("conversations")
      .insert({
        channel,
        channel_connection_id: connectionId,
        external_thread_id: threadId,
        subject,
        participants: [normalizedFrom],
        last_message_at: timestamp,
        client_id: clientId,
        is_synced: true,
        last_synced_at: new Date().toISOString(),
        status: "open",
        priority: "normal",
        relationship_health: "active",
        is_resolved: false,
        extracted_asks: [],
        extracted_decisions: [],
        extracted_deadlines: [],
      })
      .select("id")
      .single();

    if (convoErr) throw convoErr;
    conversationId = newConvo.id;
  }

  // ─── Insert message (idempotent by external_message_id) ───────────────────
  // Check if message already exists
  const { data: existingMsg } = await supabase
    .from("comms_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("external_message_id", input.message_id)
    .maybeSingle();

  let messageId: string;

  if (existingMsg) {
    messageId = existingMsg.id;
  } else {
    const { data: newMsg, error: msgErr } = await supabase
      .from("comms_messages")
      .insert({
        conversation_id: conversationId,
        channel,
        channel_connection_id: connectionId,
        external_message_id: input.message_id,
        client_id: clientId,
        sender_display_name: senderDisplay,
        sender_identifier: normalizedFrom,
        body_text: messageText,
        has_attachments: !!input.has_media,
        is_from_client: true,
        in_reply_to: input.quoted_message_id || null,
        source_url: null,
        classification: null,
        synced_at: new Date().toISOString(),
        created_at: timestamp,
      })
      .select("id")
      .single();

    if (msgErr) {
      // Might be duplicate — try to fetch
      if (msgErr.code === "23505") {
        const { data: dup } = await supabase
          .from("comms_messages")
          .select("id")
          .eq("external_message_id", input.message_id)
          .maybeSingle();
        messageId = dup?.id || "duplicate";
      } else {
        throw msgErr;
      }
    } else {
      messageId = newMsg.id;
    }

    // Insert attachments
    if (input.media && messageId && messageId !== "duplicate") {
      await supabase.from("message_attachments").insert({
        message_id: messageId,
        file_name: input.media.filename || "media",
        mime_type: input.media.mimetype || null,
        external_url: input.media.url || null,
      });
    }
  }

  // ─── Upsert external identity ─────────────────────────────────────────────
  await supabase.from("external_identities").upsert({
    provider: channel === "email" ? "gmail" : channel,
    identifier: normalizedFrom,
    identifier_type: channel === "whatsapp" ? "phone" : channel === "email" ? "email" : "slack_user_id",
    display_name: senderDisplay,
    client_id: clientId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider,identifier", ignoreDuplicates: false });

  // ─── Update connection sync count ─────────────────────────────────────────
  if (connectionId) {
    await supabase.from("channel_connections").update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: "success",
      sync_health: "healthy",
    }).eq("id", connectionId);
  }

  return {
    conversation_id: conversationId,
    message_id: messageId,
    client_id: clientId,
    thread_id: threadId,
    linked: !!clientId,
  };
}

/**
 * Bridge for existing v1 API routes.
 * Call this after task/client creation when source_channel is provided,
 * to ensure the conversation context is captured in Comms.
 */
export async function bridgeAgentMessage(opts: {
  source_channel: string;
  source_message_id?: string;
  client_name?: string;
  client_id?: string;
  body: string;
  from?: string;
  contact_name?: string;
}) {
  if (!opts.source_channel || opts.source_channel === "manual" || opts.source_channel === "api") return;
  if (!opts.source_message_id) return;

  await ingestWhatsAppMessage({
    from: opts.from || "agent",
    body: opts.body,
    message_id: opts.source_message_id,
    channel: opts.source_channel,
    contact_name: opts.contact_name || opts.from,
    client_name: opts.client_name,
    client_id: opts.client_id,
  });
}
