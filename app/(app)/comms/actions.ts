"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth/getCurrentMember";
import type {
  Conversation,
  CommsMessage,
  ChannelType,
  ConversationStatus,
  ConversationPriority,
  RelationshipHealth,
  WaitingOn,
  MessageClassification,
} from "@/lib/types/comms";

// ─── Conversations ──────────────────────────────────────────────────────────

export async function getConversations(opts?: {
  channel?: ChannelType;
  client_id?: string;
  status?: ConversationStatus;
  priority?: ConversationPriority;
  waiting_on?: WaitingOn;
  health?: RelationshipHealth;
  has_follow_up?: boolean;
  unlinked?: boolean;
  search?: string;
  limit?: number;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("conversations")
    .select("*, clients(name, industry)")
    .order("last_message_at", { ascending: false })
    .limit(opts?.limit || 100);

  if (opts?.channel) query = query.eq("channel", opts.channel);
  if (opts?.client_id) query = query.eq("client_id", opts.client_id);
  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.priority) query = query.eq("priority", opts.priority);
  if (opts?.waiting_on) query = query.eq("waiting_on", opts.waiting_on);
  if (opts?.health) query = query.eq("relationship_health", opts.health);
  if (opts?.has_follow_up) query = query.not("follow_up_at", "is", null);
  if (opts?.unlinked) query = query.is("client_id", null);
  if (opts?.search) query = query.or(`subject.ilike.%${opts.search}%`);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((c) => ({
    ...c,
    client_name: (c.clients as { name: string; industry?: string } | null)?.name || null,
    client_industry: (c.clients as { name: string; industry?: string } | null)?.industry || null,
    extracted_asks: c.extracted_asks || [],
    extracted_decisions: c.extracted_decisions || [],
    extracted_deadlines: c.extracted_deadlines || [],
  })) as (Conversation & { client_name: string | null })[];
}

export async function getConversationById(conversationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*, clients(name, industry, primary_email, website, phone)")
    .eq("id", conversationId)
    .single();
  if (error) throw error;
  return {
    ...data,
    client_name: (data.clients as Record<string, unknown> | null)?.name || null,
    client_industry: (data.clients as Record<string, unknown> | null)?.industry || null,
    extracted_asks: data.extracted_asks || [],
    extracted_decisions: data.extracted_decisions || [],
    extracted_deadlines: data.extracted_deadlines || [],
  } as Conversation & { client_name: string | null };
}

// ─── Conversation CRM Actions ───────────────────────────────────────────────

export async function updateConversationStatus(conversationId: string, status: ConversationStatus) {
  const supabase = await createClient();
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "resolved") updates.is_resolved = true;
  if (status === "waiting_on_client") updates.waiting_on = "client";
  if (status === "waiting_on_us") updates.waiting_on = "team";
  if (status === "approval_pending") updates.waiting_on = "approval";
  if (status === "open") updates.waiting_on = null;
  const { error } = await supabase.from("conversations").update(updates).eq("id", conversationId);
  if (error) throw error;
  const member = await getCurrentMember();
  await auditLog("conversation_status_changed", "conversation", conversationId, member?.id || null, { status });
}

export async function updateConversationPriority(conversationId: string, priority: ConversationPriority) {
  const supabase = await createClient();
  const { error } = await supabase.from("conversations").update({ priority, updated_at: new Date().toISOString() }).eq("id", conversationId);
  if (error) throw error;
}

export async function linkConversationToClient(conversationId: string, clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("conversations").update({ client_id: clientId, updated_at: new Date().toISOString() }).eq("id", conversationId);
  if (error) throw error;
  // Also update messages
  await supabase.from("comms_messages").update({ client_id: clientId }).eq("conversation_id", conversationId);
  const member = await getCurrentMember();
  await auditLog("conversation_linked_to_client", "conversation", conversationId, member?.id || null, { client_id: clientId });
}

export async function linkConversationToProject(conversationId: string, projectId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("conversations").update({ linked_project_id: projectId, updated_at: new Date().toISOString() }).eq("id", conversationId);
  if (error) throw error;
}

export async function setFollowUp(conversationId: string, followUpAt: string, note?: string) {
  const supabase = await createClient();
  const member = await getCurrentMember();
  const { error } = await supabase.from("conversations").update({
    follow_up_at: followUpAt,
    follow_up_owner: member?.id || null,
    updated_at: new Date().toISOString(),
  }).eq("id", conversationId);
  if (error) throw error;

  await supabase.from("follow_up_reminders").insert({
    conversation_id: conversationId,
    reminder_at: followUpAt,
    note: note || null,
    owner_id: member?.id || null,
  });
}

export async function updateRelationshipHealth(conversationId: string, health: RelationshipHealth) {
  const supabase = await createClient();
  const { error } = await supabase.from("conversations").update({ relationship_health: health, updated_at: new Date().toISOString() }).eq("id", conversationId);
  if (error) throw error;
}

export async function updateConversationSummary(conversationId: string, summary: string, asks?: { text: string; resolved: boolean }[], decisions?: { text: string; date: string }[], deadlines?: { text: string; date: string }[]) {
  const supabase = await createClient();
  const updates: Record<string, unknown> = { ai_summary: summary, updated_at: new Date().toISOString() };
  if (asks) updates.extracted_asks = asks;
  if (decisions) updates.extracted_decisions = decisions;
  if (deadlines) updates.extracted_deadlines = deadlines;
  const { error } = await supabase.from("conversations").update(updates).eq("id", conversationId);
  if (error) throw error;
}

// ─── Messages ───────────────────────────────────────────────────────────────

export async function getMessages(conversationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comms_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at");
  if (error) throw error;
  return (data || []).map((m) => ({
    ...m,
    extracted_entities: m.extracted_entities || null,
    linked_task_ids: m.linked_task_ids || [],
    linked_fact_ids: m.linked_fact_ids || [],
  })) as CommsMessage[];
}

export async function classifyMessage(messageId: string, classification: MessageClassification) {
  const supabase = await createClient();
  const { error } = await supabase.from("comms_messages").update({ classification }).eq("id", messageId);
  if (error) throw error;
}

// ─── Conversation-Task Links ────────────────────────────────────────────────

export async function getLinkedTasks(conversationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversation_task_links")
    .select("*, tasks(id, title, priority, column_id, due_date, project_id)")
    .eq("conversation_id", conversationId);
  if (error) throw error;
  return (data || []).map((l) => ({ ...l, task: l.tasks }));
}

export async function linkTaskToConversation(conversationId: string, taskId: string, messageId?: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversation_task_links")
    .insert({ conversation_id: conversationId, task_id: taskId, message_id: messageId || null });
  if (error && error.code !== "23505") throw error;
}

// ─── CRM Insight Bundle ─────────────────────────────────────────────────────

export async function getClientCrmInsight(clientId: string) {
  const supabase = await createClient();

  const [clientRes, contactsRes, factsRes, tasksRes, projectsRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase.from("client_contacts").select("id, name, role, email, phone, preferred_channel").eq("client_id", clientId).order("name").limit(10),
    supabase.from("client_facts").select("id, key, value, verification_status, confidence").eq("client_id", clientId).order("key").limit(30),
    supabase.from("tasks").select("id, title, priority, due_date, column_id, project_id, project_columns(name)").eq("client_id", clientId).order("created_at", { ascending: false }).limit(15),
    supabase.from("projects").select("id, name, status").eq("client_id", clientId).eq("status", "active").order("created_at", { ascending: false }).limit(10),
  ]);

  const openTasks = (tasksRes.data || []).filter((t) => {
    const colName = ((t.project_columns as unknown) as { name: string })?.name || "";
    return !colName.toLowerCase().includes("done") && !colName.toLowerCase().includes("approved");
  });

  return {
    client: clientRes.data,
    contacts: contactsRes.data || [],
    facts: factsRes.data || [],
    open_tasks: openTasks.map((t) => ({
      id: t.id, title: t.title, priority: t.priority, due_date: t.due_date,
      column: ((t.project_columns as unknown) as { name: string })?.name || "Unknown",
    })),
    active_projects: projectsRes.data || [],
    summary: {
      total_open_tasks: openTasks.length,
      active_projects: (projectsRes.data || []).length,
      total_contacts: (contactsRes.data || []).length,
      total_facts: (factsRes.data || []).length,
    },
  };
}

// ─── Card Relations ─────────────────────────────────────────────────────────

export async function getRelatedCards(taskId: string) {
  const supabase = await createClient();
  const [fromRes, toRes] = await Promise.all([
    supabase.from("card_relations").select("*, tasks!card_relations_to_card_id_fkey(id, title, column_id)").eq("from_card_id", taskId),
    supabase.from("card_relations").select("*, tasks!card_relations_from_card_id_fkey(id, title, column_id)").eq("to_card_id", taskId),
  ]);
  return [...(fromRes.data || []).map((r) => ({ ...r, related_task: r.tasks, direction: "outgoing" as const })), ...(toRes.data || []).map((r) => ({ ...r, related_task: r.tasks, direction: "incoming" as const }))];
}

export async function createCardRelation(opts: { from_card_id: string; to_card_id: string; relation_type: string; origin?: "explicit" | "inferred" }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("card_relations").insert({ from_card_id: opts.from_card_id, to_card_id: opts.to_card_id, relation_type: opts.relation_type, origin: opts.origin || "explicit" }).select().single();
  if (error && error.code !== "23505") throw error;
  return data;
}

export async function deleteCardRelation(relationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("card_relations").delete().eq("id", relationId);
  if (error) throw error;
}

// ─── Connector Config ───────────────────────────────────────────────────────

export async function getConnectorConfigs() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("connector_configs").select("*").order("connector_key");
  if (error) throw error;
  return data;
}

export async function updateConnectorConfig(connectorId: string, updates: { mode?: string; enabled?: boolean; scopes?: string[]; allowed_board_ids?: string[]; allowed_client_ids?: string[] }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("connector_configs").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", connectorId).select().single();
  if (error) throw error;
  return data;
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

export async function getAuditLog(opts?: { entity_type?: string; entity_id?: string; limit?: number }) {
  const supabase = await createClient();
  let query = supabase.from("audit_log_events").select("*").order("created_at", { ascending: false }).limit(opts?.limit || 50);
  if (opts?.entity_type) query = query.eq("entity_type", opts.entity_type);
  if (opts?.entity_id) query = query.eq("entity_id", opts.entity_id);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function auditLog(eventType: string, entityType: string, entityId: string, actorId: string | null, metadata?: Record<string, unknown>) {
  const supabase = await createClient();
  await supabase.from("audit_log_events").insert({
    actor_type: "user", actor_id: actorId, event_type: eventType,
    entity_type: entityType, entity_id: entityId,
    metadata_json: metadata ? JSON.stringify(metadata) : null,
  });
}
