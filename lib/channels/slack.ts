// ─── Slack Provider Adapter ──────────────────────────────────────────────────
// Read-only Slack channel sync via Bot OAuth + Web API. No AI dependencies.

import type { ChannelAdapter, OAuthResult, ProviderSource, NormalizedMessage, NormalizedConversation } from "./types";
import { getProviderCredentials } from "./credentials";

const SLACK_API = "https://slack.com/api";
const AUTH_URL = "https://slack.com/oauth/v2/authorize";
const BOT_SCOPES = "channels:history,channels:read,groups:history,groups:read,users:read,users:read.email,team:read";

async function getCreds() { return getProviderCredentials("slack"); }

async function slackApi(method: string, token: string, params?: Record<string, string>) {
  const url = new URL(`${SLACK_API}/${method}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack ${method}: ${data.error}`);
  return data;
}

function tsToIso(ts: string): string { return new Date(parseFloat(ts) * 1000).toISOString(); }

const userCache = new Map<string, { name: string; email?: string; is_bot: boolean }>();

async function lookupUser(userId: string, token: string) {
  if (userCache.has(userId)) return userCache.get(userId)!;
  try {
    const d = await slackApi("users.info", token, { user: userId });
    const u = d.user;
    const info = { name: u.real_name || u.name || userId, email: u.profile?.email, is_bot: u.is_bot || false };
    userCache.set(userId, info);
    return info;
  } catch { return { name: userId, is_bot: false }; }
}

function normalizeSlackMsg(
  msg: Record<string, unknown>,
  channelId: string,
  channelName: string,
  user: { name: string; email?: string; is_bot: boolean },
): { message: NormalizedMessage; convo: NormalizedConversation } {
  const threadTs = (msg.thread_ts as string) || (msg.ts as string);
  const threadId = `${channelId}:${threadTs}`;
  const sentAt = tsToIso(msg.ts as string);
  const text = (msg.text as string) || "";
  const files = (msg.files || []) as Record<string, unknown>[];

  return {
    message: {
      external_message_id: `${channelId}:${msg.ts}`,
      external_thread_id: threadId,
      channel: "slack",
      direction: user.is_bot ? "outbound" : "inbound",
      sender_display_name: user.name,
      sender_identifier: user.email || (msg.user as string) || "unknown",
      recipient_identifiers: [],
      body_text: text,
      body_html: null,
      has_attachments: files.length > 0,
      source_url: null,
      sent_at: sentAt,
      received_at: sentAt,
      raw_payload: null,
      attachments: files.map((f) => ({
        external_attachment_id: (f.id as string) || null,
        file_name: (f.name as string) || "attachment",
        mime_type: (f.mimetype as string) || null,
        file_size: (f.size as number) || null,
        external_url: (f.url_private as string) || null,
      })),
    },
    convo: {
      external_thread_id: threadId,
      channel: "slack",
      subject: channelName,
      preview_text: text.slice(0, 150),
      participants: [user.email || (msg.user as string) || "unknown"],
      participants_summary: channelName,
      last_message_at: sentAt,
      source_url: null,
    },
  };
}

export const slackAdapter: ChannelAdapter = {
  provider: "slack",

  getOAuthUrl(redirectUri, state) {
    const clientId = process.env.SLACK_CLIENT_ID || "";
    return `${AUTH_URL}?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope: BOT_SCOPES, state })}`;
  },

  async handleOAuthCallback(code, redirectUri) {
    const creds = await getCreds();
    const res = await fetch(`${SLACK_API}/oauth.v2.access`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: creds.client_id, client_secret: creds.client_secret, redirect_uri: redirectUri }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(`Slack OAuth: ${data.error}`);
    return {
      access_token: data.access_token,
      account_id: data.team?.id,
      display_name: data.team?.name || "Slack Workspace",
      metadata: { bot_user_id: data.bot_user_id, team_id: data.team?.id, team_name: data.team?.name },
    };
  },

  async refreshAccessToken() { throw new Error("Slack bot tokens do not expire"); },

  async listSources(token) {
    const sources: ProviderSource[] = [];
    let cursor: string | undefined;
    do {
      const params: Record<string, string> = { types: "public_channel,private_channel", limit: "200" };
      if (cursor) params.cursor = cursor;
      const data = await slackApi("conversations.list", token, params);
      for (const ch of data.channels || []) {
        if (ch.is_archived) continue;
        sources.push({ external_id: ch.id, name: `#${ch.name}`, source_type: ch.is_private ? "group" : "channel" });
      }
      cursor = data.response_metadata?.next_cursor;
    } while (cursor);
    return sources;
  },

  async backfill(token, since, sources, onBatch) {
    const enabled = sources.filter((s) => s.is_enabled);
    const sinceTs = (since.getTime() / 1000).toString();
    let total = 0;

    for (const src of enabled) {
      let cursor: string | undefined;
      // Get channel name
      let channelName = src.external_id;
      try {
        const info = await slackApi("conversations.info", token, { channel: src.external_id });
        channelName = `#${info.channel?.name || src.external_id}`;
      } catch { /* use ID */ }

      do {
        const params: Record<string, string> = { channel: src.external_id, oldest: sinceTs, limit: "100", inclusive: "true" };
        if (cursor) params.cursor = cursor;
        let data;
        try { data = await slackApi("conversations.history", token, params); } catch { break; }

        const rawMsgs = (data.messages || []) as Record<string, unknown>[];
        if (!rawMsgs.length) break;

        const batchMsgs: NormalizedMessage[] = [];
        const batchConvos = new Map<string, NormalizedConversation>();

        for (const raw of rawMsgs) {
          if (raw.subtype && raw.subtype !== "bot_message" && raw.subtype !== "file_share") continue;
          const userId = (raw.user as string) || (raw.bot_id as string) || "unknown";
          const user = await lookupUser(userId, token);
          const { message, convo } = normalizeSlackMsg(raw, src.external_id, channelName, user);
          batchMsgs.push(message);
          const existing = batchConvos.get(convo.external_thread_id);
          if (!existing || convo.last_message_at > existing.last_message_at) batchConvos.set(convo.external_thread_id, convo);
        }

        if (batchMsgs.length) { await onBatch(batchMsgs, Array.from(batchConvos.values())); total += batchMsgs.length; }
        cursor = data.response_metadata?.next_cursor;
      } while (cursor);
    }

    return { messagesCount: total };
  },

  async syncIncremental(token, cursor, sources, onBatch) {
    const since = cursor ? new Date(cursor) : new Date(Date.now() - 5 * 60 * 1000);
    const result = await slackAdapter.backfill(token, since, sources, onBatch);
    return { cursor: new Date().toISOString(), messagesCount: result.messagesCount };
  },

  async handleWebhook(payload, headers) {
    if ((payload.type as string) === "url_verification") return null;
    if ((payload.type as string) !== "event_callback") return null;

    const event = payload.event as Record<string, unknown> | undefined;
    if (!event || (event.type as string) !== "message" || event.subtype) return null;

    const channelId = event.channel as string;
    const userId = (event.user as string) || "unknown";
    const threadTs = (event.thread_ts as string) || (event.ts as string);
    const threadId = `${channelId}:${threadTs}`;
    const sentAt = tsToIso(event.ts as string);
    const text = (event.text as string) || "";

    return {
      messages: [{
        external_message_id: `${channelId}:${event.ts}`,
        external_thread_id: threadId,
        channel: "slack" as const,
        direction: "inbound" as const,
        sender_display_name: userId,
        sender_identifier: userId,
        recipient_identifiers: [],
        body_text: text,
        body_html: null,
        has_attachments: !!((event.files as unknown[])?.length),
        source_url: null,
        sent_at: sentAt,
        received_at: sentAt,
        raw_payload: event,
      }],
      conversations: [{
        external_thread_id: threadId,
        channel: "slack" as const,
        subject: `#${channelId}`,
        preview_text: text.slice(0, 150),
        participants: [userId],
        participants_summary: `#${channelId}`,
        last_message_at: sentAt,
        source_url: null,
      }],
    };
  },
};
