// ─── Gmail Provider Adapter ──────────────────────────────────────────────────
// Read-only Gmail sync via OAuth2 + Gmail API. No AI dependencies.

import type { ChannelAdapter, OAuthResult, ProviderSource, NormalizedMessage, NormalizedConversation, NormalizedAttachment } from "./types";
import { getProviderCredentials } from "./credentials";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

async function getCreds() {
  return getProviderCredentials("gmail");
}

async function gmailGet(path: string, token: string, params?: Record<string, string>) {
  const url = new URL(`${GMAIL_API}${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Gmail API ${res.status}: ${await res.text()}`);
  return res.json();
}

function header(headers: { name: string; value: string }[], name: string): string {
  return headers?.find((h: { name: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function extractBody(payload: Record<string, unknown>): { text: string; html: string | null } {
  const mime = (payload.mimeType as string) || "";
  const body = payload.body as { data?: string } | undefined;
  const parts = payload.parts as Record<string, unknown>[] | undefined;

  if (mime === "text/plain" && body?.data) return { text: decodeBase64Url(body.data), html: null };

  let text = "";
  let html: string | null = null;

  if (parts) {
    for (const p of parts) {
      const pMime = p.mimeType as string;
      const pBody = p.body as { data?: string } | undefined;
      if (pMime === "text/plain" && pBody?.data && !text) text = decodeBase64Url(pBody.data);
      if (pMime === "text/html" && pBody?.data && !html) html = decodeBase64Url(pBody.data);
      if (pMime?.startsWith("multipart/")) {
        const nested = extractBody(p);
        if (!text && nested.text) text = nested.text;
        if (!html && nested.html) html = nested.html;
      }
    }
  }

  if (!text && html) text = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return { text, html };
}

function extractAttachments(payload: Record<string, unknown>, msgId: string): NormalizedAttachment[] {
  const atts: NormalizedAttachment[] = [];
  const parts = payload.parts as Record<string, unknown>[] | undefined;
  if (!parts) return atts;
  for (const p of parts) {
    const fname = p.filename as string;
    const b = p.body as { attachmentId?: string; size?: number } | undefined;
    if (fname && b?.attachmentId) {
      atts.push({
        external_attachment_id: `${msgId}/${b.attachmentId}`,
        file_name: fname,
        mime_type: (p.mimeType as string) || null,
        file_size: b.size || null,
        external_url: null,
      });
    }
    if ((p.mimeType as string)?.startsWith("multipart/")) atts.push(...extractAttachments(p, msgId));
  }
  return atts;
}

function parseAddr(raw: string): { name: string | null; email: string } {
  const m = raw.match(/^(.+?)\s*<([^>]+)>$/);
  return m ? { name: m[1].replace(/"/g, "").trim(), email: m[2].toLowerCase() } : { name: null, email: raw.toLowerCase().trim() };
}

function normalizeGmailMsg(msg: Record<string, unknown>, teamEmails: string[] = []): { message: NormalizedMessage; convo: NormalizedConversation } {
  const headers = (msg.payload as Record<string, unknown>)?.headers as { name: string; value: string }[] || [];
  const from = parseAddr(header(headers, "From"));
  const to = header(headers, "To").split(",").map((r: string) => parseAddr(r.trim()));
  const subject = header(headers, "Subject");
  const date = header(headers, "Date");
  const inReplyTo = header(headers, "In-Reply-To");
  const threadId = msg.threadId as string;
  const { text, html } = extractBody(msg.payload as Record<string, unknown>);
  const atts = extractAttachments(msg.payload as Record<string, unknown>, msg.id as string);
  const sentAt = date ? new Date(date).toISOString() : new Date(parseInt(msg.internalDate as string)).toISOString();
  const isOutbound = teamEmails.some((e) => from.email.toLowerCase().includes(e.toLowerCase()));
  const allParticipants = [from.email, ...to.map((r) => r.email)];
  const preview = text.slice(0, 150).replace(/\n/g, " ");

  return {
    message: {
      external_message_id: msg.id as string,
      external_thread_id: threadId,
      channel: "email",
      direction: isOutbound ? "outbound" : "inbound",
      sender_display_name: from.name,
      sender_identifier: from.email,
      recipient_identifiers: to.map((r) => r.email),
      body_text: text,
      body_html: html,
      has_attachments: atts.length > 0,
      source_url: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
      sent_at: sentAt,
      received_at: sentAt,
      raw_payload: null,
      attachments: atts,
    },
    convo: {
      external_thread_id: threadId,
      channel: "email",
      subject: subject || null,
      preview_text: preview || null,
      participants: allParticipants,
      participants_summary: allParticipants.slice(0, 3).join(", "),
      last_message_at: sentAt,
      source_url: `https://mail.google.com/mail/u/0/#inbox/${threadId}`,
    },
  };
}

export const gmailAdapter: ChannelAdapter = {
  provider: "gmail",

  getOAuthUrl(redirectUri, state) {
    // Credentials must be injected into env before calling this (sync method)
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    return `${AUTH_URL}?${new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, response_type: "code",
      scope: SCOPES, access_type: "offline", prompt: "consent", state,
    })}`;
  },

  async handleOAuthCallback(code, redirectUri) {
    const creds = await getCreds();
    const res = await fetch(TOKEN_URL, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: creds.client_id, client_secret: creds.client_secret,
        redirect_uri: redirectUri, grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
    const tokens = await res.json();
    const profile = await (await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })).json();
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : undefined,
      account_id: profile.email,
      display_name: profile.name || profile.email,
    };
  },

  async refreshAccessToken(refreshToken) {
    const creds = await getCreds();
    const res = await fetch(TOKEN_URL, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.client_id, client_secret: creds.client_secret,
        refresh_token: refreshToken, grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error(`Refresh failed: ${await res.text()}`);
    const data = await res.json();
    return {
      access_token: data.access_token,
      expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
    };
  },

  async listSources(token) {
    const data = await gmailGet("/labels", token);
    return ((data.labels || []) as { id: string; name: string; type: string }[])
      .filter((l) => l.type === "user" || ["INBOX", "SENT", "IMPORTANT"].includes(l.id))
      .map((l): ProviderSource => ({ external_id: l.id, name: l.name, source_type: l.id === "INBOX" ? "inbox" : "label" }));
  },

  async backfill(token, since, _sources, onBatch) {
    const afterEpoch = Math.floor(since.getTime() / 1000);
    let pageToken: string | undefined;
    let total = 0;

    do {
      const params: Record<string, string> = { q: `after:${afterEpoch}`, maxResults: "50" };
      if (pageToken) params.pageToken = pageToken;
      const list = await gmailGet("/messages", token, params);
      const ids = (list.messages || []) as { id: string; threadId: string }[];
      if (!ids.length) break;

      const batchMsgs: NormalizedMessage[] = [];
      const batchConvos = new Map<string, NormalizedConversation>();

      for (let i = 0; i < ids.length; i += 10) {
        const full = await Promise.all(ids.slice(i, i + 10).map((m) => gmailGet(`/messages/${m.id}`, token, { format: "full" })));
        for (const msg of full) {
          const { message, convo } = normalizeGmailMsg(msg);
          batchMsgs.push(message);
          const existing = batchConvos.get(convo.external_thread_id);
          if (!existing || new Date(convo.last_message_at) > new Date(existing.last_message_at)) {
            batchConvos.set(convo.external_thread_id, convo);
          }
        }
      }

      await onBatch(batchMsgs, Array.from(batchConvos.values()));
      total += batchMsgs.length;
      pageToken = list.nextPageToken;
    } while (pageToken);

    return { messagesCount: total };
  },

  async syncIncremental(token, cursor, _sources, onBatch) {
    if (!cursor) {
      const profile = await gmailGet("/profile", token);
      return { cursor: profile.historyId, messagesCount: 0 };
    }

    let data;
    try {
      data = await gmailGet("/history", token, { startHistoryId: cursor, historyTypes: "messageAdded" });
    } catch {
      // historyId too old — need re-backfill
      const profile = await gmailGet("/profile", token);
      return { cursor: profile.historyId, messagesCount: 0 };
    }

    const newIds: { id: string; threadId: string }[] = [];
    for (const h of (data.history || []) as { messagesAdded?: { message: { id: string; threadId: string } }[] }[]) {
      for (const a of h.messagesAdded || []) newIds.push(a.message);
    }

    if (newIds.length > 0) {
      const msgs: NormalizedMessage[] = [];
      const convos = new Map<string, NormalizedConversation>();
      for (const m of newIds) {
        try {
          const full = await gmailGet(`/messages/${m.id}`, token, { format: "full" });
          const { message, convo } = normalizeGmailMsg(full);
          msgs.push(message);
          convos.set(convo.external_thread_id, convo);
        } catch { continue; }
      }
      if (msgs.length) await onBatch(msgs, Array.from(convos.values()));
      return { cursor: data.historyId || cursor, messagesCount: msgs.length };
    }

    return { cursor: data.historyId || cursor, messagesCount: 0 };
  },

  async handleWebhook(payload) {
    // Gmail push via Pub/Sub — just returns historyId; actual fetch happens in syncIncremental
    const msg = payload.message as { data?: string } | undefined;
    if (!msg?.data) return null;
    return { messages: [], conversations: [] };
  },
};
