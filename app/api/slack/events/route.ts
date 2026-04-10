import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { detectGranolaNote } from "@/lib/slack/detect-granola";
import { analyzeSlackNote } from "@/lib/openclaw/analyze-slack-note";

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
  const timestamp = req.headers.get("x-slack-request-timestamp") || "";
  const signature = req.headers.get("x-slack-signature") || "";

  // Verify signature
  if (!verifySlackSignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // URL verification challenge
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // Only handle event_callback
  if (payload.type !== "event_callback") {
    return NextResponse.json({ ok: true });
  }

  const event = payload.event as Record<string, unknown> | undefined;
  if (!event) return NextResponse.json({ ok: true });

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
  if (type !== "message" && type !== "app_mention") return;

  // Ignore bot messages, edits, and subtypes we don't care about
  const subtype = event.subtype as string | undefined;
  if (subtype === "message_changed" || subtype === "message_deleted") return;
  if (event.bot_id || event.bot_profile) return;

  const channelId = event.channel as string;
  const text = (event.text as string) || "";
  const userId = event.user as string | undefined;
  const ts = event.ts as string | undefined;
  const threadTs = event.thread_ts as string | undefined;

  // Channel filter
  if (ALLOWED_CHANNELS.length > 0 && !ALLOWED_CHANNELS.includes(channelId)) {
    return;
  }

  // Detect Granola-style notes
  const detection = detectGranolaNote(text, userId);
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
  } catch (err) {
    console.error("[slack/events] Analysis failed:", err);
    await supabase
      .from("opportunity_insights")
      .update({ status: "error" })
      .eq("id", insight.id);
  }
}
