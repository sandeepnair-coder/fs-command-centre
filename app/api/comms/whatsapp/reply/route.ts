import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth/getCurrentMember";

export async function POST(req: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { conversationId, message } = await req.json();
    if (!conversationId || !message?.trim()) {
      return NextResponse.json({ error: "conversationId and message required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch conversation to get WhatsApp chat target
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .select("id, channel, external_thread_id, participants, status")
      .eq("id", conversationId)
      .single();

    if (convoErr || !convo) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (convo.channel !== "whatsapp") {
      return NextResponse.json({ error: "Only WhatsApp conversations support direct reply" }, { status: 400 });
    }

    // Extract WhatsApp target from external_thread_id (format: "wa:+phoneNumber")
    // or from participants array
    let target = "";
    if (convo.external_thread_id?.startsWith("wa:")) {
      target = convo.external_thread_id.replace("wa:", "");
    } else if (convo.participants?.length > 0) {
      target = convo.participants[0];
    }

    if (!target) {
      return NextResponse.json({ error: "No WhatsApp target found for this conversation" }, { status: 400 });
    }

    // Send via OpenClaw gateway on the server
    const openclawUrl = process.env.OPENCLAW_API_URL;
    const openclawToken = process.env.OPENCLAW_API_TOKEN;

    if (!openclawUrl || !openclawToken) {
      return NextResponse.json({ error: "OpenClaw not configured" }, { status: 500 });
    }

    // Use OpenClaw REST API to send WhatsApp message
    const baseUrl = openclawUrl.replace("wss://", "https://").replace("ws://", "http://");
    const sendRes = await fetch(`${baseUrl}/channels/whatsapp/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openclawToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target,
        message: message.trim(),
        accountId: "default",
      }),
      signal: AbortSignal.timeout(15000),
    });

    let sendResult;
    try {
      sendResult = await sendRes.json();
    } catch {
      sendResult = { ok: sendRes.ok };
    }

    if (!sendRes.ok) {
      console.error("[whatsapp-reply] Send failed:", sendResult);
      return NextResponse.json({ error: "Failed to send WhatsApp message", details: sendResult }, { status: 502 });
    }

    // Persist the outbound message in comms_messages
    const { data: savedMsg, error: msgErr } = await supabase.from("comms_messages").insert({
      conversation_id: conversationId,
      channel: "whatsapp",
      client_id: null,
      sender_display_name: member.full_name || "Admin",
      sender_identifier: "admin",
      body_text: message.trim(),
      direction: "outbound",
      is_from_client: false,
      has_attachments: false,
      classification: "general",
      created_at: new Date().toISOString(),
    }).select("id, conversation_id, channel, sender_display_name, sender_identifier, body_text, direction, is_from_client, has_attachments, classification, created_at").single();

    if (msgErr) {
      console.error("[whatsapp-reply] DB insert error:", msgErr);
    }

    // Update conversation metadata
    await supabase.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_team_reply_at: new Date().toISOString(),
      status: convo.status === "waiting_on_us" ? "waiting_on_client" : convo.status,
      preview_text: message.trim().slice(0, 200),
      updated_at: new Date().toISOString(),
    }).eq("id", conversationId);

    // Audit log
    await supabase.from("audit_log_events").insert({
      actor_type: "user",
      actor_id: member.id,
      event_type: "whatsapp_reply_sent",
      entity_type: "conversation",
      entity_id: conversationId,
      metadata_json: JSON.stringify({
        target,
        message_length: message.trim().length,
        member_name: member.full_name,
      }),
    });

    console.log(`[whatsapp-reply] Sent by ${member.full_name} to ${target}: "${message.trim().slice(0, 50)}..."`);

    return NextResponse.json({
      ok: true,
      message: savedMsg || { body_text: message.trim(), sender_display_name: member.full_name },
    });
  } catch (err) {
    console.error("[whatsapp-reply] Error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
