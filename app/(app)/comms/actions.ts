"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  Conversation,
  CommsMessage,
  ChannelType,
  MessageClassification,
} from "@/lib/types/comms";

// ─── Conversations ──────────────────────────────────────────────────────────

export async function getConversations(opts?: {
  channel?: ChannelType;
  client_id?: string;
  is_resolved?: boolean;
  search?: string;
  limit?: number;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("conversations")
    .select("*, clients(name)")
    .order("last_message_at", { ascending: false })
    .limit(opts?.limit || 100);

  if (opts?.channel) query = query.eq("channel", opts.channel);
  if (opts?.client_id) query = query.eq("client_id", opts.client_id);
  if (opts?.is_resolved !== undefined) query = query.eq("is_resolved", opts.is_resolved);
  if (opts?.search) query = query.ilike("subject", `%${opts.search}%`);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((c) => ({
    ...c,
    client_name: (c.clients as { name: string } | null)?.name || null,
  })) as (Conversation & { client_name: string | null })[];
}

export async function getConversationById(conversationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*, clients(name)")
    .eq("id", conversationId)
    .single();
  if (error) throw error;
  return {
    ...data,
    client_name: (data.clients as { name: string } | null)?.name || null,
  } as Conversation & { client_name: string | null };
}

export async function resolveConversation(conversationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ is_resolved: true, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) throw error;
}

export async function assignConversationToClient(conversationId: string, clientId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ client_id: clientId, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
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
  return data as CommsMessage[];
}

export async function classifyMessage(messageId: string, classification: MessageClassification) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("comms_messages")
    .update({ classification })
    .eq("id", messageId);
  if (error) throw error;
}

// ─── Card Relations ─────────────────────────────────────────────────────────

export async function getRelatedCards(taskId: string) {
  const supabase = await createClient();

  const [fromRes, toRes] = await Promise.all([
    supabase
      .from("card_relations")
      .select("*, tasks!card_relations_to_card_id_fkey(id, title, column_id)")
      .eq("from_card_id", taskId),
    supabase
      .from("card_relations")
      .select("*, tasks!card_relations_from_card_id_fkey(id, title, column_id)")
      .eq("to_card_id", taskId),
  ]);

  const fromRelations = (fromRes.data || []).map((r) => ({
    ...r,
    related_task: r.tasks,
    direction: "outgoing" as const,
  }));

  const toRelations = (toRes.data || []).map((r) => ({
    ...r,
    related_task: r.tasks,
    direction: "incoming" as const,
  }));

  return [...fromRelations, ...toRelations];
}

export async function createCardRelation(opts: {
  from_card_id: string;
  to_card_id: string;
  relation_type: string;
  origin?: "explicit" | "inferred";
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_relations")
    .insert({
      from_card_id: opts.from_card_id,
      to_card_id: opts.to_card_id,
      relation_type: opts.relation_type,
      origin: opts.origin || "explicit",
    })
    .select()
    .single();
  if (error && error.code !== "23505") throw error; // ignore duplicate
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
  const { data, error } = await supabase
    .from("connector_configs")
    .select("*")
    .order("connector_key");
  if (error) throw error;
  return data;
}

export async function updateConnectorConfig(
  connectorId: string,
  updates: {
    mode?: string;
    enabled?: boolean;
    scopes?: string[];
    allowed_board_ids?: string[];
    allowed_client_ids?: string[];
  }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("connector_configs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", connectorId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

export async function getAuditLog(opts?: {
  entity_type?: string;
  entity_id?: string;
  limit?: number;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("audit_log_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit || 50);

  if (opts?.entity_type) query = query.eq("entity_type", opts.entity_type);
  if (opts?.entity_id) query = query.eq("entity_id", opts.entity_id);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
