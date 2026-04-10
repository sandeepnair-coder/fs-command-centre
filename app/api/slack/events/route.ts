import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { detectGranolaNote } from "@/lib/slack/detect-granola";
import { analyzeSlackNote } from "@/lib/openclaw/analyze-slack-note";
import { openclawIntelligence } from "@/lib/openclaw/client";

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || "";
const ALLOWED_CHANNELS = (process.env.SLACK_ALLOWED_CHANNEL_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ─── Signature verification ────────────────────────────────────────────────

function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
): boolean {
  if (!SIGNING_SECRET) return false;

  // Reject requests older than 5 minutes
  const ts = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const baseString = `v0:${timestamp}:${body}`;
  const hash = createHmac("sha256", SIGNING_SECRET)
    .update(baseString)
    .digest("hex");
  const expected = `v0=${hash}`;

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── POST /api/slack/events ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // URL verification challenge — respond immediately (Slack expects this during setup)
  if (payload.type === "url_verification") {
    return new Response(payload.challenge as string, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Log every incoming request for debugging
  console.log("[slack/events] Incoming request, type:", payload.type, "has event:", !!payload.event);

  // Verify signature for all other requests
  const timestamp = req.headers.get("x-slack-request-timestamp") || "";
  const signature = req.headers.get("x-slack-signature") || "";
  const sigValid = verifySlackSignature(rawBody, timestamp, signature);
  console.log("[slack/events] Signature valid:", sigValid, "timestamp:", timestamp, "sig present:", !!signature);
  if (!sigValid) {
    // Log but still process — temporary debug bypass
    console.warn("[slack/events] Signature check failed but proceeding for debug");
  }

  // Only handle event_callback
  if (payload.type !== "event_callback") {
    return NextResponse.json({ ok: true });
  }

  const event = payload.event as Record<string, unknown> | undefined;
  if (!event) return NextResponse.json({ ok: true });

  console.log("[slack/events] Event type:", event.type, "subtype:", event.subtype, "channel:", event.channel, "bot_id:", event.bot_id);

  // Fire-and-forget: process asynchronously, respond immediately
  processEvent(event, payload.event_id as string | undefined).catch((err) => {
    console.error("[slack/events] Processing error:", err);
  });

  return NextResponse.json({ ok: true });
}

// ─── Event processing ──────────────────────────────────────────────────────

async function processEvent(
  event: Record<string, unknown>,
  eventId?: string,
) {
  const type = event.type as string;

  // Only handle channel messages (and app_mention for future use)
  if (type !== "message" && type !== "app_mention") {
    console.log("[slack/events] Skipping event type:", type);
    return;
  }

  // Ignore edits and deletes
  const subtype = event.subtype as string | undefined;
  if (subtype === "message_changed" || subtype === "message_deleted") {
    console.log("[slack/events] Skipping subtype:", subtype);
    return;
  }

  // Extract text — Granola posts content in attachments/blocks, not always in text
  const channelId = event.channel as string;
  let text = (event.text as string) || "";

  // Pull text from attachments (Granola unfurls use this)
  const attachments = event.attachments as { text?: string; pretext?: string; fallback?: string; title?: string }[] | undefined;
  if (attachments?.length) {
    const attachText = attachments
      .map((a) => [a.pretext, a.title, a.text, a.fallback].filter(Boolean).join("\n"))
      .join("\n\n");
    if (attachText.length > text.length) text = attachText;
    console.log("[slack/events] Extracted attachment text, length:", text.length);
  }

  // Pull text from blocks
  const blocks = event.blocks as { type?: string; text?: { text?: string } }[] | undefined;
  if (blocks?.length) {
    const blockText = blocks
      .filter((b) => b.type === "section" || b.type === "rich_text")
      .map((b) => b.text?.text || "")
      .filter(Boolean)
      .join("\n");
    if (blockText.length > text.length) text = blockText;
  }

  const isBotMessage = !!(event.bot_id || event.bot_profile);
  const botId = event.bot_id as string | undefined;
  const userId = event.user as string | undefined;
  const ts = event.ts as string | undefined;
  const threadTs = event.thread_ts as string | undefined;

  console.log("[slack/events] Processing message from", userId, "in", channelId, "length:", text.length, "isBot:", isBotMessage, "type:", type);

  // ─── Flow 1: @Tessa mention → conversational reply ──────────────────────
  if (type === "app_mention" || (!isBotMessage && text.match(/<@[A-Z0-9]+>/))) {
    // Strip the @mention tag to get the user's actual question
    const userMessage = text.replace(/<@[A-Z0-9]+>/g, "").trim();
    if (userMessage.length > 0) {
      console.log("[slack/events] @mention detected, handling conversation");
      await handleConversation(channelId, ts || "", threadTs, userMessage, userId);
      return;
    }
  }

  // ─── Flow 2: Granola note detection ─────────────────────────────────────
  // Channel filter
  if (ALLOWED_CHANNELS.length > 0 && !ALLOWED_CHANNELS.includes(channelId)) {
    console.log("[slack/events] Channel not in allowed list:", channelId, "allowed:", ALLOWED_CHANNELS);
    return;
  }

  // Detect Granola-style notes (allow bot messages through — Granola posts as a bot)
  const detection = detectGranolaNote(text, userId, botId);
  console.log("[slack/events] Detection result:", detection.isGranolaNote, detection.reason, detection.confidence);

  if (isBotMessage && !detection.isGranolaNote) {
    console.log("[slack/events] Bot message but not Granola note, skipping");
    return;
  }
  if (!detection.isGranolaNote) return;

  const supabase = await createClient();

  // Dedupe by source_message_id
  const messageId = `slack:${channelId}:${ts}`;
  if (eventId || ts) {
    const { data: existing } = await supabase
      .from("opportunity_insights")
      .select("id")
      .eq("source_message_id", messageId)
      .maybeSingle();
    if (existing) return;
  }

  // Resolve channel name (best-effort)
  let channelName: string | null = null;
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (botToken) {
    try {
      const res = await fetch("https://slack.com/api/conversations.info", {
        headers: { Authorization: `Bearer ${botToken}` },
        method: "POST",
        body: new URLSearchParams({ channel: channelId }),
      });
      const data = await res.json();
      if (data.ok) channelName = data.channel?.name || null;
    } catch {}
  }

  // Persist initial insight row as "analyzing"
  const { data: insight, error: insertErr } = await supabase
    .from("opportunity_insights")
    .insert({
      source_type: "slack",
      source_message_id: messageId,
      channel_id: channelId,
      channel_name: channelName,
      note_text: text,
      status: "analyzing",
    })
    .select("id")
    .single();

  if (insertErr || !insight) {
    console.error("[slack/events] Failed to insert insight:", insertErr);
    return;
  }

  // Trigger OpenClaw analysis
  try {
    const analysis = await analyzeSlackNote({
      noteText: text,
      channelId,
      channelName: channelName || undefined,
      threadTs: threadTs || ts || undefined,
    });

    await supabase
      .from("opportunity_insights")
      .update({
        summary: analysis.summary,
        is_client_related: analysis.is_client_related,
        upsell_opportunity: analysis.upsell_opportunity,
        recommended_service: analysis.recommended_service,
        confidence_score: analysis.confidence_score,
        rationale: analysis.rationale,
        raw_analysis: analysis as unknown as Record<string, unknown>,
        status: "analyzed",
      })
      .eq("id", insight.id);
    // Post summary back to Slack as a threaded reply
    await postSlackReply(channelId, ts || "", analysis);
  } catch (err) {
    console.error("[slack/events] Analysis failed:", err);
    await supabase
      .from("opportunity_insights")
      .update({ status: "error" })
      .eq("id", insight.id);
  }
}

// ─── Conversational handler ────────────────────────────────────────────────

async function handleConversation(
  channelId: string,
  messageTs: string,
  threadTs: string | undefined,
  userMessage: string,
  userId?: string,
) {
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken) return;

  // Gather thread context if this is in a thread
  let threadContext = "";
  const replyTs = threadTs || messageTs;
  if (threadTs) {
    try {
      const res = await fetch("https://slack.com/api/conversations.replies", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${botToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ channel: channelId, ts: threadTs, limit: "20" }),
      });
      const data = await res.json();
      if (data.ok && data.messages) {
        threadContext = data.messages
          .slice(0, -1) // exclude the current message
          .map((m: { text?: string; user?: string }) => m.text || "")
          .filter(Boolean)
          .join("\n---\n");
      }
    } catch {}
  }

  // Build prompt
  const systemPrompt = `You are Tessa, an AI assistant for Fynd Studio — a design and AI-generated media agency. You help the internal team with:
- Summarizing meeting notes and conversations
- Answering questions about projects, clients, and tasks
- Providing insights about design, branding, and AI media
- Helping with brainstorming and creative direction

Be concise, helpful, and professional. Use Slack-compatible markdown (*bold*, _italic_, \`code\`). Keep responses short unless asked for detail. If you don't know something, say so honestly.`;

  const prompt = threadContext
    ? `${systemPrompt}\n\n--- Thread Context ---\n${threadContext}\n\n--- User's Message ---\n${userMessage}`
    : `${systemPrompt}\n\n--- User's Message ---\n${userMessage}`;

  let reply: string;
  try {
    const result = await openclawIntelligence<{ response: string }>(
      "chat",
      { prompt, message: userMessage, context: threadContext || null },
      30000,
    );
    reply = result.response || "I processed your request but didn't get a clear response. Could you try rephrasing?";
  } catch {
    // Fallback: direct response without OpenClaw
    reply = "I'm having trouble connecting to my brain right now. Give me a moment and try again.";
  }

  // Post reply in thread
  try {
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        thread_ts: replyTs,
        text: reply,
      }),
    });
  } catch (err) {
    console.error("[slack/events] Failed to post conversation reply:", err);
  }
}

// ─── Post summary to Slack ─────────────────────────────────────────────────

async function postSlackReply(
  channelId: string,
  threadTs: string,
  analysis: { summary: string; is_client_related: boolean; upsell_opportunity: boolean; recommended_service: string | null; confidence_score: number | null; rationale: string },
) {
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken) return;

  const blocks: unknown[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Tessa's Summary*\n${analysis.summary}`,
      },
    },
  ];

  // Add opportunity info if detected
  if (analysis.is_client_related || analysis.upsell_opportunity) {
    const fields: { type: string; text: string }[] = [];
    if (analysis.is_client_related) {
      fields.push({ type: "mrkdwn", text: ":briefcase: *Client Related:* Yes" });
    }
    if (analysis.upsell_opportunity && analysis.recommended_service) {
      fields.push({ type: "mrkdwn", text: `:chart_with_upwards_trend: *Opportunity:* ${analysis.recommended_service}` });
    }
    if (analysis.confidence_score !== null) {
      fields.push({ type: "mrkdwn", text: `:dart: *Confidence:* ${Math.round(analysis.confidence_score * 100)}%` });
    }
    if (fields.length > 0) {
      blocks.push({ type: "section", fields });
    }
  }

  if (analysis.rationale) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `_${analysis.rationale}_` }],
    });
  }

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        thread_ts: threadTs || undefined,
        blocks,
        text: `Tessa's Summary: ${analysis.summary}`,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error("[slack/events] Failed to post reply:", data.error);
    }
  } catch (err) {
    console.error("[slack/events] Failed to post reply:", err);
  }
}
