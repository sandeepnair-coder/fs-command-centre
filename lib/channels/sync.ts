// ─── Sync Engine ─────────────────────────────────────────────────────────────
// Handles backfill, incremental sync, and idempotent message persistence.
// Runs server-side only.

import { createClient } from "@/lib/supabase/server";
import { getAdapter } from "./index";
import { resolveClientForIdentifier } from "./linker";
import type {
  ChannelConnection,
  ChannelSource,
  NormalizedMessage,
  NormalizedConversation,
  SyncJob,
  ChannelProvider,
} from "@/lib/types/channels";

// ─── Get valid access token (refresh if needed) ─────────────────────────────

export async function getAccessToken(connection: ChannelConnection): Promise<string> {
  const creds = connection.credentials_encrypted as Record<string, string> | null;
  if (!creds?.access_token) throw new Error("No credentials for connection");

  // Check if token is expired
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    const buffer = 5 * 60 * 1000; // 5 min buffer
    if (expiresAt.getTime() - buffer > Date.now()) {
      return creds.access_token;
    }
  } else {
    // No expiry (e.g. Slack bot tokens)
    return creds.access_token;
  }

  // Token expired — refresh
  if (!connection.refresh_token_encrypted) {
    throw new Error("Token expired and no refresh token available");
  }

  const adapter = getAdapter(connection.provider);
  const refreshed = await adapter.refreshToken(connection.refresh_token_encrypted);

  // Update stored credentials
  const supabase = await createClient();
  await supabase.from("channel_connections").update({
    credentials_encrypted: { ...creds, access_token: refreshed.access_token },
    token_expires_at: refreshed.expires_at || null,
    updated_at: new Date().toISOString(),
  }).eq("id", connection.id);

  return refreshed.access_token;
}

// ─── Persist batch of normalized messages + conversations ───────────────────

async function persistBatch(
  connectionId: string,
  provider: ChannelProvider,
  messages: NormalizedMessage[],
  conversations: NormalizedConversation[],
  autoLink: boolean,
) {
  const supabase = await createClient();
  let messagesInserted = 0;
  let conversationsUpserted = 0;

  // 1. Upsert conversations
  for (const convo of conversations) {
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("channel_connection_id", connectionId)
      .eq("external_thread_id", convo.external_thread_id)
      .maybeSingle();

    if (existing) {
      await supabase.from("conversations").update({
        last_message_at: convo.last_message_at,
        participants: convo.participants,
        updated_at: new Date().toISOString(),
        is_synced: true,
        last_synced_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      // Try auto-link for new conversations
      let clientId: string | null = null;
      if (autoLink) {
        clientId = await resolveClientForConversation(provider, convo);
      }

      const { error } = await supabase.from("conversations").insert({
        channel: convo.channel,
        channel_connection_id: connectionId,
        external_thread_id: convo.external_thread_id,
        subject: convo.subject,
        participants: convo.participants,
        last_message_at: convo.last_message_at,
        source_url: convo.source_url,
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
      });

      if (!error) conversationsUpserted++;
    }
  }

  // 2. Insert messages (idempotent via unique constraint)
  for (const msg of messages) {
    // Find the conversation
    const { data: convo } = await supabase
      .from("conversations")
      .select("id, client_id")
      .eq("channel_connection_id", connectionId)
      .eq("external_thread_id", msg.external_thread_id)
      .maybeSingle();

    if (!convo) continue;

    // Determine if sender is a team member
    let isFromClient = msg.is_from_client;
    if (autoLink) {
      const identity = await resolveClientForIdentifier(provider, msg.sender_identifier);
      if (identity?.is_team_member) isFromClient = false;
    }

    const { error } = await supabase.from("comms_messages").insert({
      conversation_id: convo.id,
      channel: msg.channel,
      channel_connection_id: connectionId,
      external_message_id: msg.external_message_id,
      client_id: convo.client_id,
      sender_display_name: msg.sender_display_name,
      sender_identifier: msg.sender_identifier,
      body_text: msg.body_text,
      body_html: msg.body_html,
      has_attachments: msg.has_attachments,
      is_from_client: isFromClient,
      in_reply_to: msg.in_reply_to,
      source_url: msg.source_url,
      classification: null,
      synced_at: new Date().toISOString(),
      created_at: msg.created_at,
    });

    // Duplicate key = already synced, not an error
    if (!error) {
      messagesInserted++;

      // Insert attachments
      if (msg.attachments?.length) {
        const { data: insertedMsg } = await supabase
          .from("comms_messages")
          .select("id")
          .eq("channel_connection_id", connectionId)
          .eq("external_message_id", msg.external_message_id)
          .maybeSingle();

        if (insertedMsg) {
          for (const att of msg.attachments) {
            await supabase.from("message_attachments").insert({
              message_id: insertedMsg.id,
              file_name: att.file_name,
              mime_type: att.mime_type,
              size_bytes: att.size_bytes,
              external_url: att.external_url,
              provider_file_id: att.provider_file_id,
            });
          }
        }
      }

      // Upsert external identity
      await supabase.from("external_identities").upsert({
        provider,
        identifier: msg.sender_identifier,
        identifier_type: provider === "gmail" ? "email" : provider === "whatsapp" ? "phone" : "slack_user_id",
        display_name: msg.sender_display_name,
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider,identifier", ignoreDuplicates: true });
    }
  }

  return { messagesInserted, conversationsUpserted };
}

// ─── Auto-link: resolve client from conversation participants ────────────────

async function resolveClientForConversation(
  provider: ChannelProvider,
  convo: NormalizedConversation,
): Promise<string | null> {
  for (const participant of convo.participants) {
    const identity = await resolveClientForIdentifier(provider, participant);
    if (identity?.client_id) return identity.client_id;
  }
  return null;
}

// ─── Run Backfill ───────────────────────────────────────────────────────────

export async function runBackfill(connectionId: string) {
  const supabase = await createClient();

  // Get connection
  const { data: connection, error: connErr } = await supabase
    .from("channel_connections")
    .select("*")
    .eq("id", connectionId)
    .single();
  if (connErr || !connection) throw new Error("Connection not found");

  // Get sources
  const { data: sources } = await supabase
    .from("channel_sources")
    .select("*")
    .eq("channel_connection_id", connectionId)
    .eq("is_enabled", true);

  // Create sync job
  const { data: job } = await supabase.from("sync_jobs").insert({
    channel_connection_id: connectionId,
    job_type: "backfill",
    status: "running",
    started_at: new Date().toISOString(),
  }).select().single();

  // Update connection status
  await supabase.from("channel_connections").update({
    status: "syncing",
    sync_health: "syncing",
    updated_at: new Date().toISOString(),
  }).eq("id", connectionId);

  const conn = connection as ChannelConnection;
  const adapter = getAdapter(conn.provider);

  try {
    const accessToken = await getAccessToken(conn);
    const since = new Date(Date.now() - (conn.backfill_days || 30) * 24 * 60 * 60 * 1000);
    let totalMessages = 0;

    const result = await adapter.backfill(
      accessToken,
      since,
      (sources || []) as ChannelSource[],
      async (messages, conversations) => {
        const batch = await persistBatch(
          connectionId,
          conn.provider,
          messages,
          conversations,
          conn.auto_link_enabled,
        );
        totalMessages += batch.messagesInserted;

        // Update job progress
        if (job) {
          await supabase.from("sync_jobs").update({
            messages_processed: totalMessages,
          }).eq("id", job.id);
        }
      },
    );

    // Save cursor if returned
    if (result.cursor) {
      await supabase.from("sync_cursors").upsert({
        channel_connection_id: connectionId,
        cursor_type: conn.provider === "gmail" ? "history_id" : "timestamp",
        cursor_value: result.cursor,
        updated_at: new Date().toISOString(),
      }, { onConflict: "channel_connection_id,cursor_type" });
    }

    // Update job + connection
    await supabase.from("sync_jobs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      messages_processed: totalMessages,
    }).eq("id", job?.id);

    await supabase.from("channel_connections").update({
      status: "connected",
      sync_health: "healthy",
      last_sync_at: new Date().toISOString(),
      last_sync_status: "success",
      messages_synced_count: (conn.messages_synced_count || 0) + totalMessages,
      updated_at: new Date().toISOString(),
    }).eq("id", connectionId);

    // Audit log
    await supabase.from("audit_log_events").insert({
      actor_type: "system",
      event_type: "channel_backfill_completed",
      entity_type: "channel_connection",
      entity_id: connectionId,
      metadata_json: JSON.stringify({ messages: totalMessages, provider: conn.provider }),
    });

    return { messagesCount: totalMessages };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    await supabase.from("sync_jobs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      last_error: errorMsg,
      errors_count: 1,
    }).eq("id", job?.id);

    await supabase.from("channel_connections").update({
      status: "error",
      sync_health: "error",
      last_error: errorMsg,
      last_sync_status: "error",
      updated_at: new Date().toISOString(),
    }).eq("id", connectionId);

    throw err;
  }
}

// ─── Run Incremental Sync ───────────────────────────────────────────────────

export async function runIncrementalSync(connectionId: string) {
  const supabase = await createClient();

  const { data: connection } = await supabase
    .from("channel_connections")
    .select("*")
    .eq("id", connectionId)
    .single();
  if (!connection) throw new Error("Connection not found");

  const conn = connection as ChannelConnection;
  const adapter = getAdapter(conn.provider);

  // Get cursor
  const { data: cursorRow } = await supabase
    .from("sync_cursors")
    .select("cursor_value")
    .eq("channel_connection_id", connectionId)
    .maybeSingle();

  // Get sources
  const { data: sources } = await supabase
    .from("channel_sources")
    .select("*")
    .eq("channel_connection_id", connectionId)
    .eq("is_enabled", true);

  const accessToken = await getAccessToken(conn);
  let totalMessages = 0;

  const result = await adapter.syncIncremental(
    accessToken,
    cursorRow?.cursor_value || null,
    (sources || []) as ChannelSource[],
    async (messages, conversations) => {
      const batch = await persistBatch(
        connectionId,
        conn.provider,
        messages,
        conversations,
        conn.auto_link_enabled,
      );
      totalMessages += batch.messagesInserted;
    },
  );

  // Update cursor
  if (result.cursor) {
    await supabase.from("sync_cursors").upsert({
      channel_connection_id: connectionId,
      cursor_type: conn.provider === "gmail" ? "history_id" : "timestamp",
      cursor_value: result.cursor,
      updated_at: new Date().toISOString(),
    }, { onConflict: "channel_connection_id,cursor_type" });
  }

  // Update connection health
  await supabase.from("channel_connections").update({
    last_sync_at: new Date().toISOString(),
    last_sync_status: "success",
    sync_health: "healthy",
    messages_synced_count: (conn.messages_synced_count || 0) + totalMessages,
    updated_at: new Date().toISOString(),
  }).eq("id", connectionId);

  return { messagesCount: totalMessages };
}

// ─── Process Webhook Event ──────────────────────────────────────────────────

export async function processWebhookEvent(
  provider: ChannelProvider,
  payload: Record<string, unknown>,
  headers: Record<string, string>,
) {
  const supabase = await createClient();

  // Log the webhook event
  const { data: event } = await supabase.from("webhook_events").insert({
    provider,
    event_type: (payload.type as string) || (payload.event as string) || "unknown",
    payload,
    processing_status: "processing",
  }).select().single();

  try {
    const adapter = getAdapter(provider);
    const result = await adapter.handleWebhook(payload, headers);

    if (!result || (result.messages.length === 0 && result.conversations.length === 0)) {
      await supabase.from("webhook_events").update({
        processing_status: "ignored",
        processed_at: new Date().toISOString(),
      }).eq("id", event?.id);
      return;
    }

    // Find the connection for this provider
    const { data: connections } = await supabase
      .from("channel_connections")
      .select("*")
      .eq("provider", provider)
      .eq("status", "connected")
      .limit(1);

    const connection = (connections || [])[0] as ChannelConnection | undefined;
    if (!connection) {
      await supabase.from("webhook_events").update({
        processing_status: "ignored",
        error: "No active connection found",
        processed_at: new Date().toISOString(),
      }).eq("id", event?.id);
      return;
    }

    await persistBatch(
      connection.id,
      provider,
      result.messages,
      result.conversations,
      connection.auto_link_enabled,
    );

    await supabase.from("webhook_events").update({
      processing_status: "processed",
      channel_connection_id: connection.id,
      processed_at: new Date().toISOString(),
    }).eq("id", event?.id);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await supabase.from("webhook_events").update({
      processing_status: "failed",
      error: errorMsg,
      processed_at: new Date().toISOString(),
    }).eq("id", event?.id);
  }
}
