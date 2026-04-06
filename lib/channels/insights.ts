// ─── Conversation Insight Extraction ─────────────────────────────────────────
// Feeds normalized conversation data into OpenClaw for CRM intelligence extraction.

import { createClient } from "@/lib/supabase/server";
import {
  summarizeThread,
  classifyMessage as classifyViaOpenClaw,
  extractFacts,
} from "@/lib/openclaw/client";
import type { InsightType } from "@/lib/types/channels";

/**
 * Extract CRM insights from a conversation's messages and persist them.
 * Extracts: asks, deadlines, blockers, risks, facts, suggested actions, summary.
 */
export async function extractConversationInsights(conversationId: string) {
  const supabase = await createClient();

  // Get conversation + messages
  const [convoRes, msgsRes] = await Promise.all([
    supabase.from("conversations").select("*, clients(name)").eq("id", conversationId).single(),
    supabase.from("comms_messages")
      .select("id, sender_display_name, body_text, created_at, is_from_client")
      .eq("conversation_id", conversationId)
      .order("created_at"),
  ]);

  if (convoRes.error || !convoRes.data) return;
  const conversation = convoRes.data;
  const messages = msgsRes.data || [];
  if (messages.length === 0) return;

  const clientName = (conversation.clients as { name?: string } | null)?.name;

  try {
    // 1. Summarize the thread
    const summary = await summarizeThread(
      messages.map((m) => ({
        sender: m.sender_display_name || "Unknown",
        body: m.body_text,
        timestamp: m.created_at,
      }))
    );

    // Persist summary
    await upsertInsight(supabase, conversationId, "summary", summary.summary, "high");

    // Persist open asks
    for (const ask of summary.open_asks || []) {
      await upsertInsight(supabase, conversationId, "ask", ask, "medium");
    }

    // Persist decisions
    for (const decision of summary.decisions || []) {
      await upsertInsight(supabase, conversationId, "decision", decision, "high");
    }

    // Update conversation summary fields
    await supabase.from("conversations").update({
      ai_summary: summary.summary,
      extracted_asks: (summary.open_asks || []).map((text) => ({ text, resolved: false })),
      extracted_decisions: (summary.decisions || []).map((text) => ({ text, date: new Date().toISOString() })),
      updated_at: new Date().toISOString(),
    }).eq("id", conversationId);

    // 2. Extract facts if linked to a client
    if (conversation.client_id) {
      const fullText = messages.map((m) => m.body_text).join("\n\n");
      try {
        const factsResult = await extractFacts(fullText, { client_name: clientName });
        for (const fact of factsResult.facts || []) {
          await upsertInsight(supabase, conversationId, "fact", `${fact.key}: ${fact.value}`, fact.confidence);

          // Also save to client_facts
          await supabase.from("client_facts").upsert({
            client_id: conversation.client_id,
            key: fact.key,
            value: fact.value,
            verification_status: "inferred",
            confidence: fact.confidence,
            source_count: 1,
            last_observed_at: new Date().toISOString(),
          }, { onConflict: "client_id,key", ignoreDuplicates: false });
        }
      } catch {
        // Facts extraction is non-critical
      }
    }

    // 3. Classify individual messages and extract blockers/risks
    for (const msg of messages) {
      if (!msg.is_from_client) continue;
      try {
        const classification = await classifyViaOpenClaw(msg.body_text);
        // Update message classification
        await supabase.from("comms_messages").update({
          classification: classification.classification,
        }).eq("id", msg.id);

        if (classification.classification === "blocker") {
          await upsertInsight(supabase, conversationId, "blocker", msg.body_text.slice(0, 300), classification.confidence, msg.id);
        }
      } catch {
        // Individual classification failure is non-critical
        continue;
      }
    }

    // 4. Detect deadline patterns
    const deadlinePatterns = [
      /by (tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|end of (?:day|week|month))/i,
      /deadline[:\s]+(.*?)(?:\.|$)/i,
      /due[:\s]+(.*?)(?:\.|$)/i,
      /need(?:ed)? by (.*?)(?:\.|$)/i,
      /before (.*?)(?:\.|$)/i,
    ];

    for (const msg of messages) {
      if (!msg.is_from_client) continue;
      for (const pattern of deadlinePatterns) {
        const match = msg.body_text.match(pattern);
        if (match) {
          await upsertInsight(supabase, conversationId, "deadline", match[0].trim(), "medium", msg.id);
          break;
        }
      }
    }

    // 5. Detect risk indicators
    const lastClientMsg = messages.filter((m) => m.is_from_client).pop();
    const lastTeamMsg = messages.filter((m) => !m.is_from_client).pop();

    if (lastClientMsg && lastTeamMsg) {
      const clientTime = new Date(lastClientMsg.created_at).getTime();
      const teamTime = new Date(lastTeamMsg.created_at).getTime();
      const hoursSinceClientReply = (Date.now() - clientTime) / (1000 * 60 * 60);

      // Client waiting > 24h with no team reply after
      if (clientTime > teamTime && hoursSinceClientReply > 24) {
        await upsertInsight(supabase, conversationId, "risk",
          `Client has been waiting ${Math.round(hoursSinceClientReply)}h for a reply`, "high");

        // Update conversation health
        await supabase.from("conversations").update({
          relationship_health: hoursSinceClientReply > 48 ? "at_risk" : "active",
          waiting_on: "team",
          status: "waiting_on_us",
        }).eq("id", conversationId);
      }
    }

    // Audit
    await supabase.from("audit_log_events").insert({
      actor_type: "system",
      event_type: "insights_extracted",
      entity_type: "conversation",
      entity_id: conversationId,
      metadata_json: JSON.stringify({ message_count: messages.length }),
    });

  } catch (err) {
    console.error("Insight extraction failed:", err);
    // Non-fatal — insights are best-effort
  }
}

/**
 * Get all insights for a conversation, grouped by type.
 */
export async function getConversationInsights(conversationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversation_insights")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function upsertInsight(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  type: InsightType,
  content: string,
  confidence: "high" | "medium" | "low",
  sourceMessageId?: string,
) {
  // Check for duplicate content
  const { data: existing } = await supabase
    .from("conversation_insights")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("insight_type", type)
    .eq("content", content)
    .maybeSingle();

  if (existing) return; // Already exists

  await supabase.from("conversation_insights").insert({
    conversation_id: conversationId,
    insight_type: type,
    content,
    confidence,
    source_message_id: sourceMessageId || null,
  });
}
