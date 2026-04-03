import { createClient } from "@/lib/supabase/server";
import type { UpsertClientInput, UpdateClientInput, AddClientContactInput, AddClientFactInput, SearchClientsInput, GetClientProfileInput, CreateWorkStreamInput, ManageColumnsInput, ListMembersInput } from "@/lib/api/schemas";

async function resolveClientId(opts: { client_id?: string; client_name?: string }) {
  const supabase = await createClient();
  if (opts.client_id) return opts.client_id;
  if (opts.client_name) {
    const { data } = await supabase.from("clients").select("id").ilike("name", `%${opts.client_name}%`).limit(1);
    if (data?.[0]) return data[0].id;
  }
  throw new Error("Client not found");
}

async function audit(event: string, entityType: string, entityId: string, agentRunId?: string, meta?: Record<string, unknown>) {
  const supabase = await createClient();
  await supabase.from("audit_log_events").insert({
    actor_type: "connector", event_type: event, entity_type: entityType, entity_id: entityId,
    metadata_json: JSON.stringify({ agent_run_id: agentRunId, ...meta }),
  });
}

// ─── Upsert client ──────────────────────────────────────────────────────────

export async function upsertClient(input: UpsertClientInput) {
  const supabase = await createClient();

  if (input.idempotency_key) {
    const { data } = await supabase.from("idempotency_keys").select("response_json").eq("key", input.idempotency_key).single();
    if (data) return { deduplicated: true, ...(data.response_json as Record<string, unknown>) };
  }

  // Check if client exists
  const { data: existing } = await supabase.from("clients").select("id, name").ilike("name", input.name).limit(1);
  if (existing?.[0]) {
    // Update existing
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.company_name) updates.company_name = input.company_name;
    if (input.primary_email) updates.primary_email = input.primary_email;
    if (input.website) updates.website = input.website;
    if (input.phone) updates.phone = input.phone;
    if (input.timezone) updates.timezone = input.timezone;
    if (input.industry) updates.industry = input.industry;
    if (input.notes) updates.notes = input.notes;

    const { data: updated } = await supabase.from("clients").update(updates).eq("id", existing[0].id).select("id, name, primary_email, website, phone, industry").single();
    const result = { client: updated, created: false, message: `Client "${updated?.name}" updated` };
    if (input.idempotency_key) await supabase.from("idempotency_keys").insert({ key: input.idempotency_key, entity_type: "client", entity_id: existing[0].id, response_json: result });
    await audit("client_upserted_by_agent", "client", existing[0].id, input.agent_run_id);
    return result;
  }

  // Create new
  const { data: newClient, error } = await supabase.from("clients").insert({
    name: input.name, company_name: input.company_name || null, primary_email: input.primary_email || null,
    website: input.website || null, phone: input.phone || null, timezone: input.timezone || null,
    industry: input.industry || null, notes: input.notes || null,
  }).select("id, name, primary_email, website, phone, industry").single();
  if (error) throw error;

  const result = { client: newClient, created: true, message: `Client "${newClient.name}" created` };
  if (input.idempotency_key) await supabase.from("idempotency_keys").insert({ key: input.idempotency_key, entity_type: "client", entity_id: newClient.id, response_json: result });
  await audit("client_created_by_agent", "client", newClient.id, input.agent_run_id);
  return result;
}

// ─── Update client ──────────────────────────────────────────────────────────

export async function updateClientByAgent(input: UpdateClientInput) {
  const supabase = await createClient();
  const clientId = await resolveClientId(input);
  const { data, error } = await supabase.from("clients").update({ ...input.updates, updated_at: new Date().toISOString() }).eq("id", clientId).select("id, name, company_name, primary_email, website, phone, timezone, industry").single();
  if (error) throw error;
  await audit("client_updated_by_agent", "client", clientId, input.agent_run_id, { updates: input.updates });
  return { client: data, message: `Client "${data.name}" updated` };
}

// ─── Add contact ────────────────────────────────────────────────────────────

export async function addClientContactByAgent(input: AddClientContactInput) {
  const supabase = await createClient();
  const clientId = await resolveClientId(input);
  const { data, error } = await supabase.from("client_contacts").insert({
    client_id: clientId, name: input.name, role: input.role || null, email: input.email || null,
    phone: input.phone || null, preferred_channel: input.preferred_channel || null, notes: input.notes || null,
    verification_status: "inferred", confidence: "medium",
  }).select("id, name, role, email, phone").single();
  if (error) throw error;
  await audit("contact_added_by_agent", "client", clientId, input.agent_run_id, { contact: input.name });
  return { contact: data, message: `Contact "${data.name}" added` };
}

// ─── Add facts ──────────────────────────────────────────────────────────────

export async function addClientFactsByAgent(input: AddClientFactInput) {
  const supabase = await createClient();
  const clientId = await resolveClientId(input);
  const saved: { key: string; value: string }[] = [];

  for (const f of input.facts) {
    await supabase.from("client_facts").upsert({
      client_id: clientId, key: f.key, value: f.value,
      verification_status: "inferred", confidence: f.confidence || "medium",
      source_count: 1, last_observed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: "client_id,key", ignoreDuplicates: false });
    saved.push({ key: f.key, value: f.value });
  }

  await audit("facts_added_by_agent", "client", clientId, input.agent_run_id, { count: saved.length });
  return { client_id: clientId, facts: saved, message: `${saved.length} facts saved (as inferred — pending human review)` };
}

// ─── Search clients ─────────────────────────────────────────────────────────

export async function searchClients(input: SearchClientsInput) {
  const supabase = await createClient();
  let query = supabase.from("clients").select("id, name, company_name, primary_email, website, industry, phone").order("name").limit(input.limit);
  if (input.query) query = query.or(`name.ilike.%${input.query}%,company_name.ilike.%${input.query}%,primary_email.ilike.%${input.query}%`);
  const { data, error } = await query;
  if (error) throw error;
  return { clients: data || [] };
}

// ─── Get client profile ─────────────────────────────────────────────────────

export async function getClientProfile(input: GetClientProfileInput) {
  const supabase = await createClient();
  const clientId = await resolveClientId(input);

  const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).single();
  let contacts: unknown[] = [];
  let facts: unknown[] = [];
  let projects: unknown[] = [];

  if (input.include_contacts) {
    const { data } = await supabase.from("client_contacts").select("id, name, role, email, phone, preferred_channel, verification_status").eq("client_id", clientId).order("name");
    contacts = data || [];
  }
  if (input.include_facts) {
    const { data } = await supabase.from("client_facts").select("id, key, value, verification_status, confidence, last_observed_at").eq("client_id", clientId).order("key");
    facts = data || [];
  }
  if (input.include_projects) {
    const { data } = await supabase.from("projects").select("id, name, status, due_date, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(20);
    projects = data || [];
  }

  return { client, contacts, facts, projects };
}

// ─── Create work stream ─────────────────────────────────────────────────────

export async function createWorkStreamByAgent(input: CreateWorkStreamInput) {
  const supabase = await createClient();
  const clientId = await resolveClientId({ client_name: input.client_name });
  let projectId: string | null = null;
  if (input.project_name) {
    const { data } = await supabase.from("projects").select("id").ilike("name", `%${input.project_name}%`).limit(1);
    projectId = data?.[0]?.id || null;
  }

  const { data, error } = await supabase.from("work_streams").insert({
    client_id: clientId, name: input.name, project_id: projectId, summary: input.summary || null,
  }).select("id, name, summary").single();
  if (error) throw error;
  await audit("work_stream_created_by_agent", "work_stream", data.id, input.agent_run_id);
  return { work_stream: data, message: `Work stream "${data.name}" created` };
}

// ─── Manage columns ─────────────────────────────────────────────────────────

export async function manageColumnsByAgent(input: ManageColumnsInput) {
  const supabase = await createClient();
  let projectId = input.project_id;
  if (!projectId && input.project_name) {
    const { data } = await supabase.from("projects").select("id").ilike("name", `%${input.project_name}%`).limit(1);
    projectId = data?.[0]?.id;
  }
  if (!projectId) throw new Error("Project not found");

  const added: string[] = [];
  const renamed: { from: string; to: string }[] = [];

  if (input.add_columns?.length) {
    const { data: existing } = await supabase.from("project_columns").select("position").eq("project_id", projectId).order("position", { ascending: false }).limit(1);
    let pos = (existing?.[0]?.position || 0) + 1000;
    for (const name of input.add_columns) {
      await supabase.from("project_columns").insert({ project_id: projectId, name, position: pos });
      added.push(name);
      pos += 1000;
    }
  }

  if (input.rename_columns?.length) {
    const { data: cols } = await supabase.from("project_columns").select("id, name").eq("project_id", projectId);
    for (const r of input.rename_columns) {
      const match = cols?.find((c) => c.name.toLowerCase().includes(r.from.toLowerCase()));
      if (match) {
        await supabase.from("project_columns").update({ name: r.to }).eq("id", match.id);
        renamed.push(r);
      }
    }
  }

  await audit("columns_managed_by_agent", "project", projectId, input.agent_run_id, { added, renamed });
  return { project_id: projectId, added, renamed, message: `Columns: +${added.length} renamed:${renamed.length}` };
}

// ─── List members ───────────────────────────────────────────────────────────

export async function listMembers(input: ListMembersInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("members").select("id, full_name, email, role, status").eq("status", "active").order("full_name").limit(input.limit);
  if (error) throw error;
  return { members: data || [] };
}
