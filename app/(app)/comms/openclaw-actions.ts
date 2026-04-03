"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth/getCurrentMember";
import {
  summarizeThread,
  classifyMessage,
  extractFacts,
  prefillTask,
  generateClientSummary,
  enrichClient,
  checkOpenClawHealth,
  OpenClawError,
} from "@/lib/openclaw/client";

// ─── Health ─────────────────────────────────────────────────────────────────

export async function testOpenClawConnection() {
  return checkOpenClawHealth();
}

// ─── Summarize a conversation thread ────────────────────────────────────────

export async function summarizeConversation(conversationId: string) {
  const supabase = await createClient();

  const { data: messages, error } = await supabase
    .from("comms_messages")
    .select("sender_display_name, body_text, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at");

  if (error) throw error;
  if (!messages?.length) return { summary: "No messages to summarize.", open_asks: [], decisions: [], approvals: [] };

  const result = await summarizeThread(
    messages.map((m) => ({
      sender: m.sender_display_name || "Unknown",
      body: m.body_text,
      timestamp: m.created_at,
    }))
  );

  // Log audit event
  const member = await getCurrentMember();
  await supabase.from("audit_log_events").insert({
    actor_type: "connector",
    actor_id: member?.id || null,
    event_type: "thread_summarized",
    entity_type: "conversation",
    entity_id: conversationId,
    metadata_json: JSON.stringify({ message_count: messages.length }),
  });

  return result;
}

// ─── Classify a single message ──────────────────────────────────────────────

export async function classifyCommsMessage(messageId: string) {
  const supabase = await createClient();

  const { data: msg, error } = await supabase
    .from("comms_messages")
    .select("body_text")
    .eq("id", messageId)
    .single();

  if (error) throw error;

  const result = await classifyMessage(msg.body_text);

  // Update the message classification
  await supabase
    .from("comms_messages")
    .update({ classification: result.classification })
    .eq("id", messageId);

  return result;
}

// ─── Extract facts from conversation and save to client ─────────────────────

export async function extractFactsFromConversation(conversationId: string, clientId: string) {
  const supabase = await createClient();

  const [convoRes, clientRes] = await Promise.all([
    supabase.from("comms_messages").select("body_text").eq("conversation_id", conversationId).order("created_at"),
    supabase.from("clients").select("name").eq("id", clientId).single(),
  ]);

  if (convoRes.error) throw convoRes.error;

  const fullText = (convoRes.data || []).map((m) => m.body_text).join("\n\n");
  const result = await extractFacts(fullText, { client_name: clientRes.data?.name });

  // Save extracted facts as inferred
  for (const fact of result.facts) {
    await supabase.from("client_facts").upsert(
      {
        client_id: clientId,
        key: fact.key,
        value: fact.value,
        verification_status: "inferred",
        confidence: fact.confidence,
        source_count: 1,
        last_observed_at: new Date().toISOString(),
      },
      { onConflict: "client_id,key", ignoreDuplicates: false }
    );
  }

  // Audit
  await supabase.from("audit_log_events").insert({
    actor_type: "connector",
    event_type: "facts_extracted",
    entity_type: "client",
    entity_id: clientId,
    metadata_json: JSON.stringify({ fact_count: result.facts.length, conversation_id: conversationId }),
  });

  return result;
}

// ─── Prefill task from comms thread ─────────────────────────────────────────

export async function prefillTaskFromThread(conversationId: string) {
  const supabase = await createClient();

  const [convoRes, msgsRes] = await Promise.all([
    supabase.from("conversations").select("subject, clients(name)").eq("id", conversationId).single(),
    supabase.from("comms_messages").select("sender_display_name, body_text, created_at").eq("conversation_id", conversationId).order("created_at"),
  ]);

  if (convoRes.error) throw convoRes.error;

  const result = await prefillTask({
    thread_subject: convoRes.data?.subject || "",
    messages: (msgsRes.data || []).map((m) => ({
      sender: m.sender_display_name || "Unknown",
      body: m.body_text,
      timestamp: m.created_at,
    })),
    client_name: (convoRes.data?.clients as unknown as { name: string } | null)?.name,
  });

  return result;
}

// ─── Generate client intelligence summary ───────────────────────────────────

export async function generateClientIntelligence(clientId: string) {
  const supabase = await createClient();

  const [clientRes, factsRes, tasksRes, msgsRes] = await Promise.all([
    supabase.from("clients").select("name").eq("id", clientId).single(),
    supabase.from("client_facts").select("key, value").eq("client_id", clientId),
    supabase.from("tasks").select("title, column_id").eq("client_id", clientId).limit(20),
    supabase.from("comms_messages").select("body_text, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(20),
  ]);

  if (clientRes.error) throw clientRes.error;

  const result = await generateClientSummary({
    name: clientRes.data.name,
    facts: (factsRes.data || []).map((f) => ({ key: f.key, value: f.value })),
    recent_tasks: (tasksRes.data || []).map((t) => ({ title: t.title, status: t.column_id })),
    recent_messages: (msgsRes.data || []).map((m) => ({ body: m.body_text, timestamp: m.created_at })),
  });

  // Save summary as a client fact
  await supabase.from("client_facts").upsert(
    {
      client_id: clientId,
      key: "ai_summary",
      value: result.summary,
      verification_status: "inferred",
      confidence: "high",
      last_observed_at: new Date().toISOString(),
    },
    { onConflict: "client_id,key", ignoreDuplicates: false }
  );

  // Audit
  await supabase.from("audit_log_events").insert({
    actor_type: "connector",
    event_type: "client_summary_generated",
    entity_type: "client",
    entity_id: clientId,
  });

  return result;
}

// ─── Enrich client from seed data ───────────────────────────────────────────

export async function enrichClientData(clientId: string) {
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("name, primary_email, website")
    .eq("id", clientId)
    .single();

  if (error) throw error;

  const domain = client.primary_email?.split("@")[1] || undefined;

  const result = await enrichClient({
    name: client.name,
    email: client.primary_email || undefined,
    website: client.website || undefined,
    domain,
  });

  // Save suggestions as inferred facts
  for (const s of result.suggestions) {
    await supabase.from("client_facts").upsert(
      {
        client_id: clientId,
        key: s.key,
        value: s.value,
        verification_status: "inferred",
        confidence: s.confidence,
        source_count: 1,
        last_observed_at: new Date().toISOString(),
      },
      { onConflict: "client_id,key", ignoreDuplicates: false }
    );
  }

  // Audit
  await supabase.from("audit_log_events").insert({
    actor_type: "connector",
    event_type: "client_enriched",
    entity_type: "client",
    entity_id: clientId,
    metadata_json: JSON.stringify({ suggestion_count: result.suggestions.length }),
  });

  return result;
}
