// ─── Slack Provider Adapter ──────────────────────────────────────────────────
// Uses Slack OAuth2 (Bot Token) + Web API for channel message ingestion.

import type {
  ChannelAdapter,
  OAuthCallbackResult,
  ProviderSource,
  NormalizedMessage,
  NormalizedConversation,
  ChannelSource,
} from "@/lib/types/channels";
import { getSlackCredentials } from "./credentials";

const SLACK_API = "https://slack.com/api";
const SLACK_AUTH_URL = "https://slack.com/oauth/v2/authorize";

const BOT_SCOPES = [
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "users:read",
  "users:read.email",
  "team:read",
].join(",");

async function slackApi(method: string, accessToken: string, params?: Record<string, string>) {
  const url = new URL(`${SLACK_API}/${method}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack API ${method}: ${data.error}`);
  return data;
}

function slackTsToIso(ts: string): string {
  return new Date(parseFloat(ts) * 1000).toISOString();
}

// Cache for user lookups within a sync session
const userCache = new Map<string, { name: string; email?: string; is_bot: boolean }>();

async function resolveUser(userId: string, accessToken: string) {
  if (userCache.has(userId)) return userCache.get(userId)!;
  try {
    const data = await slackApi("users.info", accessToken, { user: userId });
    const user = data.user;
    const info = {
      name: user.real_name || user.name || userId,
      email: user.profile?.email,
      is_bot: user.is_bot || false,
    };
    userCache.set(userId, info);
    return info;
  } catch {
    return { name: userId, email: undefined, is_bot: false };
  }
}

export const slackAdapter: ChannelAdapter = {
  provider: "slack",

  getOAuthUrl(redirectUri: string, state: string): string {
    // Sync path uses env var; the server action pre-injects from DB
    const clientId = process.env.SLACK_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: BOT_SCOPES,
      state,
    });
    return `${SLACK_AUTH_URL}?${params.toString()}`;
  },

  async handleOAuthCallback(code: string, redirectUri: string): Promise<OAuthCallbackResult> {
    const creds = await getSlackCredentials();
    const res = await fetch(`${SLACK_API}/oauth.v2.access`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        redirect_uri: redirectUri,
      }),
    });

    const data = await res.json();
    if (!data.ok) throw new Error(`Slack OAuth failed: ${data.error}`);

    return {
      access_token: data.access_token,
      // Slack bot tokens don't expire, no refresh token needed
      account_id: data.team?.id || data.enterprise?.id,
      account_display_name: data.team?.name || "Slack Workspace",
      metadata: {
        bot_user_id: data.bot_user_id,
        team_id: data.team?.id,
        team_name: data.team?.name,
        enterprise_id: data.enterprise?.id,
      },
    };
  },

  async refreshToken() {
    // Slack bot tokens don't expire
    throw new Error("Slack bot tokens do not expire");
  },

  async listSources(accessToken: string) {
    const sources: ProviderSource[] = [];

    // List public channels
    let cursor: string | undefined;
    do {
      const params: Record<string, string> = { types: "public_channel,private_channel", limit: "200" };
      if (cursor) params.cursor = cursor;

      const data = await slackApi("conversations.list", accessToken, params);
      for (const ch of data.channels || []) {
        if (ch.is_archived) continue;
        sources.push({
          external_id: ch.id,
          name: `#${ch.name}`,
          source_type: ch.is_private ? "group" : "channel",
          metadata: { topic: ch.topic?.value, purpose: ch.purpose?.value, num_members: ch.num_members },
        });
      }
      cursor = data.response_metadata?.next_cursor;
    } while (cursor);

    return sources;
  },

  async backfill(accessToken, since, sources, onBatch) {
    const enabledSources = sources.filter((s) => s.is_enabled);
    const sinceTs = (since.getTime() / 1000).toString();
    let totalMessages = 0;

    for (const source of enabledSources) {
      let cursor: string | undefined;

      do {
        const params: Record<string, string> = {
          channel: source.external_id,
          oldest: sinceTs,
          limit: "100",
          inclusive: "true",
        };
        if (cursor) params.cursor = cursor;

        let data;
        try {
          data = await slackApi("conversations.history", accessToken, params);
        } catch (e) {
          // Channel might not be accessible
          console.error(`Failed to read ${source.name}:`, e);
          break;
        }

        const messages = (data.messages || []) as Record<string, unknown>[];
        if (messages.length === 0) break;

        const batchMessages: NormalizedMessage[] = [];
        const batchConversations: Map<string, NormalizedConversation> = new Map();

        for (const msg of messages) {
          if (msg.subtype && msg.subtype !== "bot_message" && msg.subtype !== "file_share") continue;

          const userId = msg.user as string || msg.bot_id as string || "unknown";
          const user = await resolveUser(userId, accessToken);
          const threadTs = (msg.thread_ts as string) || (msg.ts as string);
          const threadId = `${source.external_id}:${threadTs}`;

          batchMessages.push({
            external_message_id: `${source.external_id}:${msg.ts}`,
            external_thread_id: threadId,
            channel: "slack",
            sender_display_name: user.name,
            sender_identifier: user.email || userId,
            body_text: (msg.text as string) || "",
            body_html: null,
            has_attachments: !!((msg.files as unknown[])?.length),
            is_from_client: !user.is_bot,
            in_reply_to: msg.thread_ts && msg.thread_ts !== msg.ts ? (msg.thread_ts as string) : null,
            source_url: null,
            created_at: slackTsToIso(msg.ts as string),
            raw_payload: null,
            attachments: ((msg.files || []) as Record<string, unknown>[]).map((f) => ({
              file_name: (f.name as string) || "attachment",
              mime_type: (f.mimetype as string) || null,
              size_bytes: (f.size as number) || null,
              external_url: (f.url_private as string) || null,
              provider_file_id: f.id as string || null,
            })),
          });

          if (!batchConversations.has(threadId)) {
            batchConversations.set(threadId, {
              external_thread_id: threadId,
              channel: "slack",
              subject: source.name,
              participants: [user.email || userId],
              last_message_at: slackTsToIso(msg.ts as string),
              source_url: null,
            });
          } else {
            const existing = batchConversations.get(threadId)!;
            const identifier = user.email || userId;
            if (!existing.participants.includes(identifier)) existing.participants.push(identifier);
            const msgTime = slackTsToIso(msg.ts as string);
            if (msgTime > existing.last_message_at) existing.last_message_at = msgTime;
          }
        }

        if (batchMessages.length > 0) {
          await onBatch(batchMessages, Array.from(batchConversations.values()));
          totalMessages += batchMessages.length;
        }

        cursor = data.response_metadata?.next_cursor;
      } while (cursor);
    }

    return { messagesCount: totalMessages };
  },

  async syncIncremental(accessToken, cursor, sources, onBatch) {
    // For Slack, incremental sync uses the same history approach
    // but with oldest set to the cursor timestamp
    const since = cursor ? new Date(cursor) : new Date(Date.now() - 5 * 60 * 1000);
    const result = await slackAdapter.backfill(accessToken, since, sources, onBatch);
    return {
      cursor: new Date().toISOString(),
      messagesCount: result.messagesCount,
    };
  },

  async handleWebhook(payload, headers) {
    // Slack Events API
    const type = payload.type as string;

    // URL verification challenge
    if (type === "url_verification") {
      return null; // handled at route level
    }

    if (type !== "event_callback") return null;

    const event = payload.event as Record<string, unknown> | undefined;
    if (!event) return null;

    const eventType = event.type as string;
    if (eventType !== "message" || event.subtype) return null;

    const channelId = event.channel as string;
    const userId = event.user as string || "unknown";
    const threadTs = (event.thread_ts as string) || (event.ts as string);
    const threadId = `${channelId}:${threadTs}`;

    const msg: NormalizedMessage = {
      external_message_id: `${channelId}:${event.ts}`,
      external_thread_id: threadId,
      channel: "slack",
      sender_display_name: userId, // will be resolved during persistence
      sender_identifier: userId,
      body_text: (event.text as string) || "",
      body_html: null,
      has_attachments: !!((event.files as unknown[])?.length),
      is_from_client: true, // resolved during linking
      in_reply_to: event.thread_ts && event.thread_ts !== event.ts ? (event.thread_ts as string) : null,
      source_url: null,
      created_at: slackTsToIso(event.ts as string),
      raw_payload: event,
    };

    const convo: NormalizedConversation = {
      external_thread_id: threadId,
      channel: "slack",
      subject: `#${channelId}`,
      participants: [userId],
      last_message_at: msg.created_at,
      source_url: null,
    };

    return { messages: [msg], conversations: [convo] };
  },
};
