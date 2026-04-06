// ─── Gmail Provider Adapter ──────────────────────────────────────────────────
// Uses Google OAuth2 + Gmail API (REST) for read-only message ingestion.

import type {
  ChannelAdapter,
  OAuthCallbackResult,
  ProviderSource,
  NormalizedMessage,
  NormalizedConversation,
  NormalizedAttachment,
  ChannelSource,
} from "@/lib/types/channels";
import { getGmailCredentials } from "./credentials";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

async function gmailFetch(path: string, accessToken: string, params?: Record<string, string>) {
  const url = new URL(`${GMAIL_API}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail API ${res.status}: ${body}`);
  }
  return res.json();
}

function parseHeader(headers: { name: string; value: string }[], name: string): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function extractTextBody(payload: Record<string, unknown>): string {
  if (!payload) return "";

  const mimeType = payload.mimeType as string || "";
  const body = payload.body as { data?: string; size?: number } | undefined;

  // Simple text part
  if (mimeType === "text/plain" && body?.data) {
    return Buffer.from(body.data, "base64url").toString("utf-8");
  }

  // Multipart — recurse into parts
  const parts = payload.parts as Record<string, unknown>[] | undefined;
  if (parts) {
    // Prefer text/plain, fall back to text/html stripped
    for (const part of parts) {
      const partMime = part.mimeType as string;
      if (partMime === "text/plain") {
        const partBody = part.body as { data?: string } | undefined;
        if (partBody?.data) return Buffer.from(partBody.data, "base64url").toString("utf-8");
      }
      // Recurse into nested multipart
      if (partMime?.startsWith("multipart/")) {
        const nested = extractTextBody(part);
        if (nested) return nested;
      }
    }
    // Fall back to HTML
    for (const part of parts) {
      if ((part.mimeType as string) === "text/html") {
        const partBody = part.body as { data?: string } | undefined;
        if (partBody?.data) {
          const html = Buffer.from(partBody.data, "base64url").toString("utf-8");
          return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
        }
      }
    }
  }

  return "";
}

function extractHtmlBody(payload: Record<string, unknown>): string | null {
  if (!payload) return null;
  const parts = payload.parts as Record<string, unknown>[] | undefined;
  if (parts) {
    for (const part of parts) {
      if ((part.mimeType as string) === "text/html") {
        const body = part.body as { data?: string } | undefined;
        if (body?.data) return Buffer.from(body.data, "base64url").toString("utf-8");
      }
      if ((part.mimeType as string)?.startsWith("multipart/")) {
        const nested = extractHtmlBody(part);
        if (nested) return nested;
      }
    }
  }
  return null;
}

function extractAttachments(payload: Record<string, unknown>, messageId: string): NormalizedAttachment[] {
  const attachments: NormalizedAttachment[] = [];
  const parts = payload.parts as Record<string, unknown>[] | undefined;
  if (!parts) return attachments;

  for (const part of parts) {
    const filename = part.filename as string;
    const body = part.body as { attachmentId?: string; size?: number } | undefined;
    if (filename && body?.attachmentId) {
      attachments.push({
        file_name: filename,
        mime_type: part.mimeType as string || null,
        size_bytes: body.size || null,
        external_url: null,
        provider_file_id: `${messageId}/${body.attachmentId}`,
      });
    }
    // Recurse into nested parts
    if ((part.mimeType as string)?.startsWith("multipart/")) {
      attachments.push(...extractAttachments(part, messageId));
    }
  }
  return attachments;
}

function parseEmailAddress(raw: string): { name: string | null; email: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].replace(/"/g, "").trim(), email: match[2].toLowerCase() };
  return { name: null, email: raw.toLowerCase().trim() };
}

export const gmailAdapter: ChannelAdapter = {
  provider: "gmail",

  getOAuthUrl(redirectUri: string, state: string): string {
    // Note: this is called after credentials are pre-fetched and passed via env-like context
    // For the sync path, we use the async version below
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  },

  async handleOAuthCallback(code: string, redirectUri: string): Promise<OAuthCallbackResult> {
    const creds = await getGmailCredentials();
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Token exchange failed: ${err}`);
    }

    const tokens = await tokenRes.json();

    // Get user profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : undefined,
      account_id: profile.email,
      account_display_name: profile.name || profile.email,
      metadata: { picture: profile.picture },
    };
  },

  async refreshToken(refreshToken: string) {
    const creds = await getGmailCredentials();
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
    const data = await res.json();

    return {
      access_token: data.access_token,
      expires_at: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined,
    };
  },

  async listSources(accessToken: string) {
    const data = await gmailFetch("/labels", accessToken);
    const labels = (data.labels || []) as { id: string; name: string; type: string }[];

    return labels
      .filter((l) => l.type === "user" || ["INBOX", "SENT", "IMPORTANT"].includes(l.id))
      .map((l): ProviderSource => ({
        external_id: l.id,
        name: l.name,
        source_type: l.id === "INBOX" ? "inbox" : "label",
      }));
  },

  async backfill(accessToken, since, sources, onBatch) {
    const enabledSourceIds = sources.filter((s) => s.is_enabled).map((s) => s.external_id);
    const afterEpoch = Math.floor(since.getTime() / 1000);
    let pageToken: string | undefined;
    let totalMessages = 0;

    do {
      // Build query — filter by label if specific labels selected
      const labelFilter = enabledSourceIds.length > 0
        ? enabledSourceIds.map((id) => `label:${id}`).join(" OR ")
        : "";
      const query = `after:${afterEpoch}${labelFilter ? ` (${labelFilter})` : ""}`;

      const params: Record<string, string> = { q: query, maxResults: "50" };
      if (pageToken) params.pageToken = pageToken;

      const listData = await gmailFetch("/messages", accessToken, params);
      const messageIds = (listData.messages || []) as { id: string; threadId: string }[];

      if (messageIds.length === 0) break;

      // Fetch full messages in batches of 10
      const batchMessages: NormalizedMessage[] = [];
      const batchConversations: Map<string, NormalizedConversation> = new Map();

      for (let i = 0; i < messageIds.length; i += 10) {
        const batch = messageIds.slice(i, i + 10);
        const fullMessages = await Promise.all(
          batch.map((m) => gmailFetch(`/messages/${m.id}`, accessToken, { format: "full" }))
        );

        for (const msg of fullMessages) {
          const headers = msg.payload?.headers || [];
          const from = parseHeader(headers, "From");
          const to = parseHeader(headers, "To");
          const subject = parseHeader(headers, "Subject");
          const date = parseHeader(headers, "Date");
          const messageId = parseHeader(headers, "Message-ID");
          const inReplyTo = parseHeader(headers, "In-Reply-To");
          const threadId = msg.threadId;

          const sender = parseEmailAddress(from);
          const recipients = to.split(",").map((r: string) => parseEmailAddress(r.trim()));
          const allParticipants = [sender.email, ...recipients.map((r) => r.email)];

          const normalized: NormalizedMessage = {
            external_message_id: msg.id,
            external_thread_id: threadId,
            channel: "email",
            sender_display_name: sender.name,
            sender_identifier: sender.email,
            body_text: extractTextBody(msg.payload),
            body_html: extractHtmlBody(msg.payload),
            has_attachments: extractAttachments(msg.payload, msg.id).length > 0,
            is_from_client: true, // will be resolved during linking
            in_reply_to: inReplyTo || null,
            source_url: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
            created_at: date ? new Date(date).toISOString() : new Date(parseInt(msg.internalDate)).toISOString(),
            raw_payload: null, // don't store full payload for backfill
            attachments: extractAttachments(msg.payload, msg.id),
          };

          batchMessages.push(normalized);

          if (!batchConversations.has(threadId)) {
            batchConversations.set(threadId, {
              external_thread_id: threadId,
              channel: "email",
              subject: subject || null,
              participants: allParticipants,
              last_message_at: normalized.created_at,
              source_url: `https://mail.google.com/mail/u/0/#inbox/${threadId}`,
            });
          } else {
            const existing = batchConversations.get(threadId)!;
            if (new Date(normalized.created_at) > new Date(existing.last_message_at)) {
              existing.last_message_at = normalized.created_at;
            }
            for (const p of allParticipants) {
              if (!existing.participants.includes(p)) existing.participants.push(p);
            }
          }
        }
      }

      await onBatch(batchMessages, Array.from(batchConversations.values()));
      totalMessages += batchMessages.length;

      pageToken = listData.nextPageToken;
    } while (pageToken);

    return { messagesCount: totalMessages };
  },

  async syncIncremental(accessToken, cursor, sources, onBatch) {
    // Use Gmail history API for incremental sync
    if (!cursor) {
      // No cursor — get current historyId as starting point
      const profile = await gmailFetch("/profile", accessToken);
      return { cursor: profile.historyId, messagesCount: 0 };
    }

    const params: Record<string, string> = {
      startHistoryId: cursor,
      historyTypes: "messageAdded",
    };

    const historyData = await gmailFetch("/history", accessToken, params);
    const histories = (historyData.history || []) as {
      messagesAdded?: { message: { id: string; threadId: string } }[];
    }[];

    const messageIds: { id: string; threadId: string }[] = [];
    for (const h of histories) {
      for (const added of h.messagesAdded || []) {
        messageIds.push(added.message);
      }
    }

    if (messageIds.length === 0) {
      return { cursor: historyData.historyId || cursor, messagesCount: 0 };
    }

    // Fetch and normalize new messages
    const batchMessages: NormalizedMessage[] = [];
    const batchConversations: Map<string, NormalizedConversation> = new Map();

    for (const m of messageIds) {
      try {
        const msg = await gmailFetch(`/messages/${m.id}`, accessToken, { format: "full" });
        const headers = msg.payload?.headers || [];
        const from = parseHeader(headers, "From");
        const to = parseHeader(headers, "To");
        const subject = parseHeader(headers, "Subject");
        const date = parseHeader(headers, "Date");
        const inReplyTo = parseHeader(headers, "In-Reply-To");
        const sender = parseEmailAddress(from);
        const recipients = to.split(",").map((r: string) => parseEmailAddress(r.trim()));

        batchMessages.push({
          external_message_id: msg.id,
          external_thread_id: msg.threadId,
          channel: "email",
          sender_display_name: sender.name,
          sender_identifier: sender.email,
          body_text: extractTextBody(msg.payload),
          body_html: extractHtmlBody(msg.payload),
          has_attachments: extractAttachments(msg.payload, msg.id).length > 0,
          is_from_client: true,
          in_reply_to: inReplyTo || null,
          source_url: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
          created_at: date ? new Date(date).toISOString() : new Date(parseInt(msg.internalDate)).toISOString(),
          raw_payload: null,
          attachments: extractAttachments(msg.payload, msg.id),
        });

        if (!batchConversations.has(msg.threadId)) {
          batchConversations.set(msg.threadId, {
            external_thread_id: msg.threadId,
            channel: "email",
            subject: subject || null,
            participants: [sender.email, ...recipients.map((r) => r.email)],
            last_message_at: date ? new Date(date).toISOString() : new Date(parseInt(msg.internalDate)).toISOString(),
            source_url: `https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`,
          });
        }
      } catch {
        // Message may have been deleted between listing and fetching
        continue;
      }
    }

    if (batchMessages.length > 0) {
      await onBatch(batchMessages, Array.from(batchConversations.values()));
    }

    return {
      cursor: historyData.historyId || cursor,
      messagesCount: batchMessages.length,
    };
  },

  async handleWebhook(payload) {
    // Gmail push notifications contain { message: { data, messageId } }
    // The data is a base64-encoded JSON with { emailAddress, historyId }
    const message = payload.message as { data?: string } | undefined;
    if (!message?.data) return null;

    const decoded = JSON.parse(Buffer.from(message.data, "base64").toString("utf-8"));
    // We return the historyId to be used for incremental sync
    // Actual message fetching happens in the sync engine
    return {
      messages: [],
      conversations: [],
    };
  },
};
