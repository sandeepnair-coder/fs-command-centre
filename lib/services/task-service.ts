import { createClient } from "@/lib/supabase/server";
import type { CreateTasksInput, UpdateTaskInput, AddCommentInput } from "@/lib/api/schemas";

// ─── Create tasks for a project ─────────────────────────────────────────────

export async function createTasksForProject(input: CreateTasksInput) {
  const supabase = await createClient();

  // Idempotency check
  if (input.idempotency_key) {
    const { data: existing } = await supabase
      .from("idempotency_keys")
      .select("response_json")
      .eq("key", input.idempotency_key)
      .single();
    if (existing) {
      return { deduplicated: true, ...(existing.response_json as Record<string, unknown>) };
    }
  }

  // Resolve project
  let projectId = input.project_id;
  if (!projectId && input.project_name) {
    const { data } = await supabase.from("projects").select("id").ilike("name", `%${input.project_name}%`).limit(1);
    projectId = data?.[0]?.id;
  }
  if (!projectId) throw new Error("Project not found. Provide project_id or a valid project_name.");

  // Get columns
  const { data: columns } = await supabase
    .from("project_columns")
    .select("id, name, position")
    .eq("project_id", projectId)
    .order("position");

  if (!columns?.length) throw new Error("No columns found on this board.");

  const colMap: Record<string, string> = {};
  columns.forEach((c) => { colMap[c.name.toLowerCase()] = c.id; });
  const defaultColId = columns[0].id;

  const createdTasks: { id: string; title: string; column: string; priority: string; deduplicated?: boolean }[] = [];

  for (let i = 0; i < input.tasks.length; i++) {
    const t = input.tasks[i];

    // Per-task dedup via source_message_id
    if (t.source_message_id) {
      const { data: existing } = await supabase
        .from("tasks")
        .select("id, title")
        .eq("source_message_id", t.source_message_id)
        .single();
      if (existing) {
        const colName = columns.find((c) => c.id === existing.id)?.name || "Existing";
        createdTasks.push({ id: existing.id, title: existing.title, column: colName, priority: "existing", deduplicated: true });
        continue;
      }
    }

    // Resolve column
    const colId = t.column
      ? Object.entries(colMap).find(([name]) => name.includes(t.column!.toLowerCase()))?.[1] || defaultColId
      : defaultColId;

    // Resolve client
    let clientId: string | null = null;
    if (t.client_name) {
      const { data: clients } = await supabase.from("clients").select("id").ilike("name", `%${t.client_name}%`).limit(1);
      clientId = clients?.[0]?.id || null;
    }

    // Get position
    const { data: lastTask } = await supabase
      .from("tasks")
      .select("position")
      .eq("column_id", colId)
      .order("position", { ascending: false })
      .limit(1);
    const position = (lastTask?.[0]?.position || 0) + 1000 + i;

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        column_id: colId,
        client_id: clientId,
        title: t.title,
        description: t.description || null,
        priority: t.priority || "low",
        due_date: t.due_date || null,
        position,
        created_by_agent: true,
        agent_run_id: input.agent_run_id || null,
        source_channel: input.source_channel || "api",
        source_message_id: t.source_message_id || null,
      })
      .select("id, title, column_id, priority")
      .single();

    if (error) throw error;

    const colName = columns.find((c) => c.id === task.column_id)?.name || "Unknown";
    createdTasks.push({ id: task.id, title: task.title, column: colName, priority: task.priority });
  }

  const result = {
    project_id: projectId,
    tasks: createdTasks,
    message: `${createdTasks.filter((t) => !t.deduplicated).length} tasks created, ${createdTasks.filter((t) => t.deduplicated).length} deduplicated`,
  };

  // Store idempotency key
  if (input.idempotency_key) {
    await supabase.from("idempotency_keys").insert({
      key: input.idempotency_key,
      entity_type: "task_batch",
      entity_id: projectId,
      response_json: result,
    });
  }

  // Audit
  await supabase.from("audit_log_events").insert({
    actor_type: "connector",
    event_type: "tasks_created_by_agent",
    entity_type: "project",
    entity_id: projectId,
    metadata_json: JSON.stringify({
      agent_run_id: input.agent_run_id,
      task_count: createdTasks.length,
    }),
  });

  return result;
}

// ─── Update task ────────────────────────────────────────────────────────────

export async function updateTaskByAgent(input: UpdateTaskInput) {
  const supabase = await createClient();

  // Resolve task
  let taskId = input.task_id;
  if (!taskId && input.source_message_id) {
    const { data } = await supabase.from("tasks").select("id").eq("source_message_id", input.source_message_id).single();
    taskId = data?.id;
  }
  if (!taskId) throw new Error("Task not found. Provide task_id or a valid source_message_id.");

  // Get task's project for column resolution
  const { data: task } = await supabase.from("tasks").select("id, project_id, column_id").eq("id", taskId).single();
  if (!task) throw new Error("Task not found");

  const updates: Record<string, unknown> = {};
  if (input.updates.title) updates.title = input.updates.title;
  if (input.updates.description !== undefined) updates.description = input.updates.description;
  if (input.updates.priority) updates.priority = input.updates.priority;
  if (input.updates.due_date !== undefined) updates.due_date = input.updates.due_date;

  // Resolve column by name
  if (input.updates.column || input.updates.status) {
    const colName = input.updates.column || input.updates.status;
    const { data: columns } = await supabase
      .from("project_columns")
      .select("id, name")
      .eq("project_id", task.project_id);
    const match = columns?.find((c) => c.name.toLowerCase().includes(colName!.toLowerCase()));
    if (match) updates.column_id = match.id;
  }

  const { data: updated, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select("id, title, priority, due_date, column_id")
    .single();

  if (error) throw error;

  // Get column name
  const { data: col } = await supabase.from("project_columns").select("name").eq("id", updated.column_id).single();

  await supabase.from("audit_log_events").insert({
    actor_type: "connector",
    event_type: "task_updated_by_agent",
    entity_type: "task",
    entity_id: taskId,
    metadata_json: JSON.stringify({ agent_run_id: input.agent_run_id, updates: input.updates }),
  });

  return {
    task: { id: updated.id, title: updated.title, priority: updated.priority, due_date: updated.due_date, column: col?.name },
    message: `Task "${updated.title}" updated`,
  };
}

// ─── Add comment ────────────────────────────────────────────────────────────

export async function addCommentByAgent(input: AddCommentInput) {
  const supabase = await createClient();

  let taskId = input.task_id;
  if (!taskId && input.source_message_id) {
    const { data } = await supabase.from("tasks").select("id").eq("source_message_id", input.source_message_id).single();
    taskId = data?.id;
  }
  if (!taskId) throw new Error("Task not found");

  const { data: comment, error } = await supabase
    .from("task_comments")
    .insert({ task_id: taskId, body: `[OpenClaw] ${input.body}`, author_id: null })
    .select("id, body, created_at")
    .single();

  if (error) throw error;

  await supabase.from("audit_log_events").insert({
    actor_type: "connector",
    event_type: "comment_added_by_agent",
    entity_type: "task",
    entity_id: taskId,
    metadata_json: JSON.stringify({ agent_run_id: input.agent_run_id }),
  });

  return { comment, message: `Comment added to task` };
}
