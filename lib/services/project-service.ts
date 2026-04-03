import { createClient } from "@/lib/supabase/server";
import type { CreateProjectInput, SearchProjectsInput, UpdateProjectInput, GetBoardContextInput } from "@/lib/api/schemas";

// ─── Create project with client resolution + tasks ──────────────────────────

export async function createProjectFromAgent(input: CreateProjectInput) {
  const supabase = await createClient();

  // Idempotency check
  if (input.idempotency_key) {
    const { data: existing } = await supabase
      .from("idempotency_keys")
      .select("entity_id, response_json")
      .eq("key", input.idempotency_key)
      .single();
    if (existing) {
      return { deduplicated: true, ...(existing.response_json as Record<string, unknown>) };
    }
  }

  // Source message dedup
  if (input.source_message_id) {
    const { data: existing } = await supabase
      .from("projects")
      .select("id, name")
      .eq("source_message_id", input.source_message_id)
      .single();
    if (existing) {
      return { deduplicated: true, project: existing, message: `Project already exists for this message` };
    }
  }

  // Resolve or create client
  let clientId: string | null = null;
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .ilike("name", `%${input.client_name}%`)
    .limit(1);

  if (clients?.[0]) {
    clientId = clients[0].id;
  } else {
    const { data: newClient } = await supabase
      .from("clients")
      .insert({ name: input.client_name })
      .select("id")
      .single();
    clientId = newClient?.id || null;
  }

  // Create project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: input.name,
      description: input.description || null,
      client_id: clientId,
      status: "active",
      due_date: input.due_date || null,
      brand_name: input.brand_name || input.client_name,
      conversation_summary: input.conversation_summary || null,
      source_channel: input.source_channel || "api",
      source_message_id: input.source_message_id || null,
      created_by_agent: true,
      agent_run_id: input.agent_run_id || null,
    })
    .select("id, name, status, created_at")
    .single();

  if (projectError) throw projectError;

  // Create default columns
  const defaultColumns = [
    "Intake / Backlog", "Ready", "In Progress", "Internal Review",
    "Client Review", "Revisions", "Approved / Done",
  ];
  const columnInserts = defaultColumns.map((name, i) => ({
    project_id: project.id,
    name,
    position: i * 1000,
  }));
  const { data: columns } = await supabase
    .from("project_columns")
    .insert(columnInserts)
    .select("id, name, position");

  // Create tasks if provided
  const createdTasks: { id: string; title: string; column: string }[] = [];
  if (input.tasks?.length && columns?.length) {
    const colMap: Record<string, string> = {};
    columns.forEach((c) => { colMap[c.name.toLowerCase()] = c.id; });
    const defaultColId = columns[0].id;

    for (let i = 0; i < input.tasks.length; i++) {
      const t = input.tasks[i];
      const colId = t.column
        ? Object.entries(colMap).find(([name]) => name.includes(t.column!.toLowerCase()))?.[1] || defaultColId
        : defaultColId;

      const { data: task } = await supabase
        .from("tasks")
        .insert({
          project_id: project.id,
          column_id: colId,
          client_id: clientId,
          title: t.title,
          description: t.description || null,
          priority: t.priority || "low",
          due_date: t.due_date || null,
          position: i * 1000,
          created_by_agent: true,
          agent_run_id: input.agent_run_id || null,
          source_channel: input.source_channel || "api",
        })
        .select("id, title, column_id")
        .single();

      if (task) {
        const colName = columns.find((c) => c.id === task.column_id)?.name || "Unknown";
        createdTasks.push({ id: task.id, title: task.title, column: colName });
      }
    }
  }

  const result = {
    project: { id: project.id, name: project.name, status: project.status, created_at: project.created_at },
    client: { id: clientId, name: input.client_name },
    columns: (columns || []).map((c) => ({ id: c.id, name: c.name })),
    tasks: createdTasks,
    message: `Project "${project.name}" created with ${createdTasks.length} tasks`,
  };

  // Store idempotency key
  if (input.idempotency_key) {
    await supabase.from("idempotency_keys").insert({
      key: input.idempotency_key,
      entity_type: "project",
      entity_id: project.id,
      response_json: result,
    });
  }

  // Audit
  await supabase.from("audit_log_events").insert({
    actor_type: "connector",
    event_type: "project_created_by_agent",
    entity_type: "project",
    entity_id: project.id,
    metadata_json: JSON.stringify({
      agent_run_id: input.agent_run_id,
      source_channel: input.source_channel,
      task_count: createdTasks.length,
      client_name: input.client_name,
    }),
  });

  return result;
}

// ─── Search projects ────────────────────────────────────────────────────────

export async function searchProjects(input: SearchProjectsInput) {
  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select("id, name, status, description, brand_name, due_date, created_at, clients(id, name)")
    .order("created_at", { ascending: false })
    .limit(input.limit);

  if (input.status) query = query.eq("status", input.status);
  if (input.query) query = query.or(`name.ilike.%${input.query}%,brand_name.ilike.%${input.query}%,description.ilike.%${input.query}%`);
  if (input.client_name) {
    const { data: clients } = await supabase.from("clients").select("id").ilike("name", `%${input.client_name}%`).limit(5);
    if (clients?.length) {
      query = query.in("client_id", clients.map((c) => c.id));
    } else {
      return { projects: [], message: "No matching clients found" };
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  return {
    projects: (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      description: p.description,
      brand_name: p.brand_name,
      due_date: p.due_date,
      client: (p.clients as unknown as { id: string; name: string })?.name || null,
      created_at: p.created_at,
    })),
  };
}

// ─── Update project ─────────────────────────────────────────────────────────

export async function updateProject(input: UpdateProjectInput) {
  const supabase = await createClient();

  let projectId = input.project_id;
  if (!projectId && input.project_name) {
    const { data } = await supabase.from("projects").select("id").ilike("name", `%${input.project_name}%`).limit(1);
    projectId = data?.[0]?.id;
  }
  if (!projectId) throw new Error("Project not found");

  const { data, error } = await supabase
    .from("projects")
    .update(input.updates)
    .eq("id", projectId)
    .select("id, name, status, description, due_date")
    .single();

  if (error) throw error;

  await supabase.from("audit_log_events").insert({
    actor_type: "connector",
    event_type: "project_updated_by_agent",
    entity_type: "project",
    entity_id: projectId,
    metadata_json: JSON.stringify({ agent_run_id: input.agent_run_id, updates: input.updates }),
  });

  return { project: data, message: `Project "${data.name}" updated` };
}

// ─── Get board context ──────────────────────────────────────────────────────

export async function getBoardContext(input: GetBoardContextInput) {
  const supabase = await createClient();

  let projectId = input.project_id;
  if (!projectId && input.project_name) {
    const { data } = await supabase.from("projects").select("id").ilike("name", `%${input.project_name}%`).limit(1);
    projectId = data?.[0]?.id;
  }
  if (!projectId) throw new Error("Project not found");

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, status, description, brand_name, due_date, clients(id, name)")
    .eq("id", projectId)
    .single();

  let columns: { id: string; name: string; task_count: number }[] = [];
  let tasks: { id: string; title: string; priority: string; column: string; due_date: string | null }[] = [];

  if (input.include_columns || input.include_tasks) {
    const { data: cols } = await supabase
      .from("project_columns")
      .select("id, name, position")
      .eq("project_id", projectId)
      .order("position");

    if (input.include_tasks && cols) {
      const { data: taskData } = await supabase
        .from("tasks")
        .select("id, title, priority, column_id, due_date")
        .eq("project_id", projectId)
        .order("position");

      const colMap = new Map(cols.map((c) => [c.id, c.name]));
      tasks = (taskData || []).map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        column: colMap.get(t.column_id) || "Unknown",
        due_date: t.due_date,
      }));

      const countMap: Record<string, number> = {};
      tasks.forEach((t) => { countMap[t.column] = (countMap[t.column] || 0) + 1; });
      columns = (cols || []).map((c) => ({ id: c.id, name: c.name, task_count: countMap[c.name] || 0 }));
    } else {
      columns = (cols || []).map((c) => ({ id: c.id, name: c.name, task_count: 0 }));
    }
  }

  return {
    project: {
      id: project?.id,
      name: project?.name,
      status: project?.status,
      description: project?.description,
      brand_name: project?.brand_name,
      client: (project?.clients as unknown as { name: string })?.name || null,
    },
    columns,
    tasks,
    summary: { total_tasks: tasks.length, columns: columns.length },
  };
}
