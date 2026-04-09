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
  display_name?: string;
  primary_email?: string;
  website?: string;
  phone?: string;
  timezone?: string;
  industry?: string;
  business_type?: string;
  country?: string;
  state?: string;
  city?: string;
  notes?: string;
  // Billing & Tax
  billing_legal_name?: string;
  billing_name?: string;
  gst_number?: string;
  pan?: string;
  cin?: string;
  billing_email?: string;
  billing_phone?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_country?: string;
  finance_contact_name?: string;
  finance_contact_email?: string;
  finance_contact_phone?: string;
  payment_terms?: string;
  currency?: string;
  po_invoice_notes?: string;
  tax_notes?: string;
}) {
  const supabase = await createClient();
  if (!opts.name?.trim()) throw new Error("Client name is required");

  const trimOrNull = (v?: string) => v?.trim() || null;

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: opts.name.trim(),
      company_name: trimOrNull(opts.company_name),
      display_name: trimOrNull(opts.display_name),
      primary_email: trimOrNull(opts.primary_email),
      website: trimOrNull(opts.website),
      phone: trimOrNull(opts.phone),
      timezone: trimOrNull(opts.timezone),
      industry: trimOrNull(opts.industry),
      business_type: trimOrNull(opts.business_type),
      country: trimOrNull(opts.country),
      state: trimOrNull(opts.state),
      city: trimOrNull(opts.city),
      notes: trimOrNull(opts.notes),
      billing_legal_name: trimOrNull(opts.billing_legal_name),
      billing_name: trimOrNull(opts.billing_name),
      gst_number: trimOrNull(opts.gst_number),
      pan: trimOrNull(opts.pan),
      cin: trimOrNull(opts.cin),
      billing_email: trimOrNull(opts.billing_email),
      billing_phone: trimOrNull(opts.billing_phone),
      billing_address_line1: trimOrNull(opts.billing_address_line1),
      billing_address_line2: trimOrNull(opts.billing_address_line2),
      billing_city: trimOrNull(opts.billing_city),
      billing_state: trimOrNull(opts.billing_state),
      billing_postal_code: trimOrNull(opts.billing_postal_code),
      billing_country: trimOrNull(opts.billing_country),
      finance_contact_name: trimOrNull(opts.finance_contact_name),
      finance_contact_email: trimOrNull(opts.finance_contact_email),
      finance_contact_phone: trimOrNull(opts.finance_contact_phone),
      payment_terms: trimOrNull(opts.payment_terms),
      currency: trimOrNull(opts.currency),
      po_invoice_notes: trimOrNull(opts.po_invoice_notes),
      tax_notes: trimOrNull(opts.tax_notes),
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
    supabase.from("tasks").select("id, client_id"),
    supabase.from("conversations").select("client_id"),
  ]);

  if (clientsRes.error) throw clientsRes.error;

  const taskCounts: Record<string, number> = {};
  const taskIdsByClient: Record<string, string[]> = {};
  (tasksRes.data || []).forEach((t) => {
    if (t.client_id) {
      taskCounts[t.client_id] = (taskCounts[t.client_id] || 0) + 1;
      if (!taskIdsByClient[t.client_id]) taskIdsByClient[t.client_id] = [];
      taskIdsByClient[t.client_id].push(t.id);
    }
  });

  const convoCounts: Record<string, number> = {};
  (convosRes.data || []).forEach((c) => {
    if (c.client_id) convoCounts[c.client_id] = (convoCounts[c.client_id] || 0) + 1;
  });

  // Fetch latest output per client for thumbnail
  const allTaskIds = (tasksRes.data || []).map((t) => t.id);
  let outputsByTask: Record<string, { storage_path: string }> = {};
  if (allTaskIds.length > 0) {
    const { data: outputs } = await supabase
      .from("task_outputs")
      .select("task_id, storage_path")
      .in("task_id", allTaskIds)
      .order("created_at", { ascending: false });
    // Keep first (latest) output per task
    (outputs || []).forEach((o) => {
      if (!outputsByTask[o.task_id]) outputsByTask[o.task_id] = o;
    });
  }

  // Build thumbnail URLs per client (latest output)
  const thumbnailUrls: Record<string, string> = {};
  for (const [clientId, taskIds] of Object.entries(taskIdsByClient)) {
    for (const tid of taskIds) {
      if (outputsByTask[tid]) {
        const { data: urlData } = await supabase.storage
          .from("task-attachments")
          .createSignedUrl(outputsByTask[tid].storage_path, 3600);
        if (urlData?.signedUrl) {
          thumbnailUrls[clientId] = urlData.signedUrl;
          break;
        }
      }
    }
  }

  return (clientsRes.data || []).map((c) => ({
    ...c,
    task_count: taskCounts[c.id] || 0,
    conversation_count: convoCounts[c.id] || 0,
    thumbnail_url: thumbnailUrls[c.id] || null,
  }));
}

// ─── Advanced Intake Batch ───────────────────────────────────────────────────

export async function batchCreateClientExtras(clientId: string, extras: {
  contacts?: { name: string; role?: string; email?: string; phone?: string; is_primary?: boolean; is_billing?: boolean; notes?: string }[];
  facts?: { key: string; value: string }[];
  assets?: { file_name: string; storage_url: string; type: BrandAsset["type"] }[];
}) {
  const supabase = await createClient();
  const member = await getCurrentMember();

  // Contacts
  if (extras.contacts?.length) {
    const contactInserts = extras.contacts
      .filter((c) => c.name.trim())
      .map((c) => ({
        client_id: clientId,
        name: c.name.trim(),
        role: c.role?.trim() || null,
        email: c.email?.trim() || null,
        phone: c.phone?.trim() || null,
        notes: [
          c.is_primary ? "Primary Contact" : "",
          c.is_billing ? "Billing/Finance Contact" : "",
          c.notes?.trim() || "",
        ].filter(Boolean).join(". ") || null,
        verification_status: "verified" as const,
      }));
    if (contactInserts.length > 0) {
      await supabase.from("client_contacts").insert(contactInserts);
    }
  }

  // Facts (brand fields + intelligence)
  if (extras.facts?.length) {
    for (const f of extras.facts) {
      if (!f.key.trim() || !f.value.trim()) continue;
      await supabase.from("client_facts").upsert({
        client_id: clientId,
        key: f.key.trim(),
        value: f.value.trim(),
        verification_status: "verified",
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: member?.id || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "client_id,key", ignoreDuplicates: false });
    }
  }

  // Assets
  if (extras.assets?.length) {
    const assetInserts = extras.assets
      .filter((a) => a.file_name.trim() && a.storage_url.trim())
      .map((a) => ({
        client_id: clientId,
        type: a.type,
        file_name: a.file_name.trim(),
        storage_url: a.storage_url.trim(),
        verification_status: "verified" as const,
      }));
    if (assetInserts.length > 0) {
      await supabase.from("brand_assets").insert(assetInserts);
    }
  }

  await logAudit("client_advanced_intake", "client", clientId, member?.id || null, {
    contacts: extras.contacts?.length || 0,
    facts: extras.facts?.length || 0,
    assets: extras.assets?.length || 0,
  });
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
