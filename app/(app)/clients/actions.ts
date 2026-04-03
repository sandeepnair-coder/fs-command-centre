"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth/getCurrentMember";
import type {
  Client,
  ClientContact,
  ClientFact,
  BrandAsset,
  WorkStream,
  VerificationStatus,
  ConfidenceBand,
} from "@/lib/types/comms";

// ─── Clients (extended) ─────────────────────────────────────────────────────

export async function getClientsExtended() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name")
    .limit(500);
  if (error) throw error;
  return data as Client[];
}

export async function getClientById(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();
  if (error) throw error;
  return data as Client;
}

export async function createClientFull(opts: {
  name: string;
  company_name?: string;
  primary_email?: string;
  website?: string;
  phone?: string;
  timezone?: string;
  industry?: string;
}) {
  const supabase = await createClient();
  if (!opts.name?.trim()) throw new Error("Client name is required");
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: opts.name.trim(),
      company_name: opts.company_name?.trim() || null,
      primary_email: opts.primary_email?.trim() || null,
      website: opts.website?.trim() || null,
      phone: opts.phone?.trim() || null,
      timezone: opts.timezone?.trim() || null,
      industry: opts.industry?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;

  // Log audit event
  const member = await getCurrentMember();
  await logAudit("client_created", "client", data.id, member?.id || null);

  return data as Client;
}

export async function updateClient(
  clientId: string,
  updates: Partial<Omit<Client, "id" | "created_at" | "updated_at">>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", clientId)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function deleteClient(clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) throw error;
}

// ─── Client Contacts ────────────────────────────────────────────────────────

export async function getClientContacts(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_contacts")
    .select("*")
    .eq("client_id", clientId)
    .order("name");
  if (error) throw error;
  return data as ClientContact[];
}

export async function createClientContact(opts: {
  client_id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  preferred_channel?: string;
  notes?: string;
  verification_status?: VerificationStatus;
  confidence?: ConfidenceBand;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_contacts")
    .insert({
      client_id: opts.client_id,
      name: opts.name.trim(),
      role: opts.role?.trim() || null,
      email: opts.email?.trim() || null,
      phone: opts.phone?.trim() || null,
      preferred_channel: opts.preferred_channel || null,
      notes: opts.notes?.trim() || null,
      verification_status: opts.verification_status || "verified",
      confidence: opts.confidence || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ClientContact;
}

export async function updateClientContact(
  contactId: string,
  updates: Partial<Omit<ClientContact, "id" | "client_id" | "created_at" | "updated_at">>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_contacts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .select()
    .single();
  if (error) throw error;
  return data as ClientContact;
}

export async function deleteClientContact(contactId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_contacts").delete().eq("id", contactId);
  if (error) throw error;
}

// ─── Client Facts ───────────────────────────────────────────────────────────

export async function getClientFacts(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_facts")
    .select("*")
    .eq("client_id", clientId)
    .order("key");
  if (error) throw error;
  return data as ClientFact[];
}

export async function upsertClientFact(opts: {
  client_id: string;
  key: string;
  value: string;
  verification_status?: VerificationStatus;
  confidence?: ConfidenceBand;
}) {
  const supabase = await createClient();
  const member = await getCurrentMember();

  const { data, error } = await supabase
    .from("client_facts")
    .upsert(
      {
        client_id: opts.client_id,
        key: opts.key,
        value: opts.value,
        verification_status: opts.verification_status || "verified",
        confidence: opts.confidence || null,
        accepted_at: opts.verification_status === "verified" ? new Date().toISOString() : null,
        accepted_by_user_id: opts.verification_status === "verified" ? member?.id : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,key", ignoreDuplicates: false }
    )
    .select()
    .single();
  if (error) throw error;
  return data as ClientFact;
}

export async function acceptClientFact(factId: string) {
  const supabase = await createClient();
  const member = await getCurrentMember();
  const { data, error } = await supabase
    .from("client_facts")
    .update({
      verification_status: "verified",
      accepted_at: new Date().toISOString(),
      accepted_by_user_id: member?.id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", factId)
    .select()
    .single();
  if (error) throw error;

  await logAudit("fact_accepted", "client_fact", factId, member?.id || null);
  return data as ClientFact;
}

export async function rejectClientFact(factId: string) {
  const supabase = await createClient();
  const member = await getCurrentMember();
  const { error } = await supabase.from("client_facts").delete().eq("id", factId);
  if (error) throw error;
  await logAudit("fact_rejected", "client_fact", factId, member?.id || null);
}

// ─── Brand Assets ───────────────────────────────────────────────────────────

export async function getBrandAssets(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_assets")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as BrandAsset[];
}

export async function createBrandAsset(opts: {
  client_id: string;
  type: BrandAsset["type"];
  file_name: string;
  storage_url: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_assets")
    .insert(opts)
    .select()
    .single();
  if (error) throw error;
  return data as BrandAsset;
}

export async function deleteBrandAsset(assetId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("brand_assets").delete().eq("id", assetId);
  if (error) throw error;
}

// ─── Work Streams ───────────────────────────────────────────────────────────

export async function getWorkStreams(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_streams")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as WorkStream[];
}

export async function createWorkStream(opts: {
  client_id: string;
  name: string;
  project_id?: string;
  summary?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_streams")
    .insert({
      client_id: opts.client_id,
      name: opts.name.trim(),
      project_id: opts.project_id || null,
      summary: opts.summary?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as WorkStream;
}

// ─── Client Stats (for list page) ──────────────────────────────────────────

export async function getClientStats() {
  const supabase = await createClient();

  const [clientsRes, tasksRes, convosRes] = await Promise.all([
    supabase.from("clients").select("id, name, primary_email, website, industry, logo_url, created_at, updated_at").order("name"),
    supabase.from("tasks").select("client_id"),
    supabase.from("conversations").select("client_id"),
  ]);

  if (clientsRes.error) throw clientsRes.error;

  const taskCounts: Record<string, number> = {};
  (tasksRes.data || []).forEach((t) => {
    if (t.client_id) taskCounts[t.client_id] = (taskCounts[t.client_id] || 0) + 1;
  });

  const convoCounts: Record<string, number> = {};
  (convosRes.data || []).forEach((c) => {
    if (c.client_id) convoCounts[c.client_id] = (convoCounts[c.client_id] || 0) + 1;
  });

  return (clientsRes.data || []).map((c) => ({
    ...c,
    task_count: taskCounts[c.id] || 0,
    conversation_count: convoCounts[c.id] || 0,
  }));
}

// ─── Audit helper ───────────────────────────────────────────────────────────

async function logAudit(
  eventType: string,
  entityType: string,
  entityId: string,
  actorId: string | null,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient();
  await supabase.from("audit_log_events").insert({
    actor_type: "user",
    actor_id: actorId,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    metadata_json: metadata ? JSON.stringify(metadata) : null,
  });
}
