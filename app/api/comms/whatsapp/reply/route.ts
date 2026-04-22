import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth/getCurrentMember";

const WA_THREAD_RE = /^wa:\+?\d{7,15}$/;
const PHONE_RE = /^\+?\d{7,15}$/;

function resolvePhone(convo: { external_thread_id: string | null; participants: string[] | null }): string | null {
  if (convo.external_thread_id && WA_THREAD_RE.test(convo.external_thread_id)) {
    return convo.external_thread_id.replace("wa:", "");
  }
  const first = convo.participants?.[0];
  if (first && PHONE_RE.test(first)) return first;
  return null;
}

export async function POST(req: NextRequest) {
  const ts = Date.now();
  let memberId: string | null = null;
  let memberName = "unknown";
  let phone = "unknown";
  let conversationId = "unknown";
  let status: "sent" | "failed" | "error" = "error";

  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!member.is_manager && member.role !== "owner" && member.role !== "admin") {
      return NextResponse.json({ error: "Reply permission denied — manager, admin, or owner role required" }, { status: 403 });
    }
    memberId = member.id;
    memberName = member.full_name || "Admin";

    // ── Input ─────────────────────────────────────────────────────────
    const body = await req.json();
    conversationId = body.conversationId;
    const message = body.message?.trim();

    if (!conversationId || typeof conversationId !== "string") {
      return NextResponse.json({ error: "conversationId required (uuid)" }, { status: 400 });
    }
    if (!message || message.length === 0) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }
    if (message.length > 4096) {
      return NextResponse.json({ error: "message too long (max 4096 chars)" }, { status: 400 });
    }

    const supabase = await createClient();

    // ── Resolve conversation ──────────────────────────────────────────
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .select("id, channel, external_thread_id, participants, status, client_id")
      .eq("id", conversationId)
      .single();

    if (convoErr || !convo) {
      console.error(`[wa-reply] Conversation not found: ${conversationId}`, convoErr);
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (convo.channel !== "whatsapp") {
      return NextResponse.json({ error: `Channel is "${convo.channel}", not whatsapp` }, { status: 400 });
    }

    // ── Resolve phone ─────────────────────────────────────────────────
    phone = resolvePhone(convo) || "";
    if (!phone) {
      console.error(`[wa-reply] No valid phone in conversation ${conversationId}: thread_id=${convo.external_thread_id}, participants=${JSON.stringify(convo.participants)}`);
      return NextResponse.json({ error: "No valid WhatsApp phone number found for this conversation" }, { status: 400 });
    }

    // ── Send via OpenClaw ─────────────────────────────────────────────
    const openclawUrl = process.env.OPENCLAW_API_URL;
    const openclawToken = process.env.OPENCLAW_API_TOKEN;
    if (!openclawUrl || !openclawToken) {
      return NextResponse.json({ error: "OpenClaw gateway not configured (missing OPENCLAW_API_URL or OPENCLAW_API_TOKEN)" }, { status: 500 });
    }

    const baseUrl = openclawUrl.replace("wss://", "https://").replace("ws://", "http://");
    console.log(`[wa-reply] Sending: member=${memberName} phone=${phone} len=${message.length}`);

    let sendResult: Record<string, unknown> = {};
    let sendOk = false;
    try {
      const sendRes = await fetch(`${baseUrl}/channels/whatsapp/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${openclawToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ target: phone, message, accountId: "default" }),
        signal: AbortSignal.timeout(15000),
      });
      try { sendResult = await sendRes.json(); } catch { sendResult = {}; }
      sendOk = sendRes.ok;

      if (!sendOk) {
        console.error(`[wa-reply] Gateway ${sendRes.status}:`, sendResult);
      }
    } catch (e) {
      console.error(`[wa-reply] Gateway error:`, (e as Error).message);
      sendResult = { error: (e as Error).message };
    }

    status = sendOk ? "sent" : "failed";

    // ── Persist message (even on failure, with status) ─────────────────
    const now = new Date().toISOString();
    const { data: savedMsg, error: msgErr } = await supabase.from("comms_messages").insert({
      conversation_id: conversationId,
      channel: "whatsapp",
      client_id: convo.client_id || null,
      sender_display_name: memberName,
      sender_identifier: `admin:${memberId}`,
      body_text: message,
      direction: "outbound",
      is_from_client: false,
      has_attachments: false,
      classification: "general",
      external_message_id: (sendResult as Record<string, string>).messageId || null,
      created_at: now,
    }).select("id, conversation_id, channel, sender_display_name, sender_identifier, body_text, direction, is_from_client, has_attachments, classification, created_at").single();

    if (msgErr) console.error(`[wa-reply] DB insert error:`, msgErr);

    // ── Update conversation (only on success) ─────────────────────────
    if (sendOk) {
      const updates: Record<string, unknown> = {
        last_message_at: now,
        last_team_reply_at: now,
        preview_text: message.slice(0, 200),
        updated_at: now,
      };
      if (convo.status === "waiting_on_us") updates.status = "waiting_on_client";
      if (convo.status === "open") updates.waiting_on = "client";
      await supabase.from("conversations").update(updates).eq("id", conversationId);
    }

    // ── Audit log ─────────────────────────────────────────────────────
    await supabase.from("audit_log_events").insert({
      actor_type: "user",
      actor_id: memberId,
      event_type: sendOk ? "whatsapp_reply_sent" : "whatsapp_reply_failed",
      entity_type: "conversation",
      entity_id: conversationId,
      metadata_json: JSON.stringify({
        status,
        phone,
        message_length: message.length,
        member_name: memberName,
        member_id: memberId,
        message_id: savedMsg?.id || null,
        gateway_response: sendOk ? undefined : sendResult,
        duration_ms: Date.now() - ts,
      }),
    });

    console.log(`[wa-reply] ${status.toUpperCase()} member=${memberName} phone=${phone} msg_id=${savedMsg?.id} ${Date.now() - ts}ms`);

    if (!sendOk) {
      return NextResponse.json({
        error: "WhatsApp message send failed — message saved as failed",
        status: "failed",
        message: savedMsg,
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      status: "sent",
      message: savedMsg || { body_text: message, sender_display_name: memberName },
    });
  } catch (err) {
    console.error(`[wa-reply] Unhandled error:`, err);

    // Best-effort audit log for crashes
    try {
      const supabase = await createClient();
      await supabase.from("audit_log_events").insert({
        actor_type: "user", actor_id: memberId,
        event_type: "whatsapp_reply_error",
        entity_type: "conversation", entity_id: conversationId,
        metadata_json: JSON.stringify({ error: (err as Error).message, phone, member_name: memberName, duration_ms: Date.now() - ts }),
      });
    } catch { /* audit log failure should not mask original error */ }

    return NextResponse.json({ error: (err as Error).message, status: "error" }, { status: 500 });
  }
}
