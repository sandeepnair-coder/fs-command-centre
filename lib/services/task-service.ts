import { createClient } from "@/lib/supabase/server";
import type { CreateTasksInput, UpdateTaskInput, MoveTaskInput, DeleteTaskInput, AddCommentInput, ManageTagsInput, ManageAssigneesInput, AddLinkInput, ManageDependenciesInput } from "@/lib/api/schemas";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function resolveTaskId(opts: { task_id?: string; task_title?: string; source_message_id?: string }) {
  const supabase = await createClient();
  if (opts.task_id) return opts.task_id;
  if (opts.source_message_id) {
    const { data } = await supabase.from("tasks").select("id").eq("source_message_id", opts.source_message_id).single();
    if (data) return data.id;
  }
  if (opts.task_title) {
    const { data } = await supabase.from("tasks").select("id").ilike("title", `%${opts.task_title}%`).order("created_at", { ascending: false }).limit(1);
    if (data?.[0]) return data[0].id;
  }
  throw new Error("Task not found. Provide task_id, task_title, or source_message_id.");
}

async function resolveColumnId(projectId: string, colName: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("project_columns").select("id, name").eq("project_id", projectId);
  const match = data?.find((c) => c.name.toLowerCase().includes(colName.toLowerCase()));
  return match?.id || data?.[0]?.id || null;
}

async function resolveMemberId(name: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("members").select("id, full_name").ilike("full_name", `%${name}%`).eq("status", "active").limit(1);
  return data?.[0]?.id || null;
}

async function resolveClientId(name: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id").ilike("name", `%${name}%`).limit(1);
  return data?.[0]?.id || null;
}

async function audit(event: string, entityType: string, entityId: string, agentRunId?: string, meta?: Record<string, unknown>) {
  const supabase = await createClient();
  await supabase.from("audit_log_events").insert({
    actor_type: "connector", event_type: event, entity_type: entityType, entity_id: entityId,
    metadata_json: JSON.stringify({ agent_run_id: agentRunId, ...meta }),
  });
}

// ─── Create tasks ───────────────────────────────────────────────────────────

export async function createTasksForProject(input: CreateTasksInput) {
  const supabase = await createClient();

  if (input.idempotency_key) {
    const { data: existing } = await supabase.from("idempotency_keys").select("response_json").eq("key", input.idempotency_key).single();
    if (existing) return { deduplicated: true, ...(existing.response_json as Record<string, unknown>) };
  }

  let projectId = input.project_id;
  if (!projectId && input.project_name) {
    const { data } = await supabase.from("projects").select("id").ilike("name", `%${input.project_name}%`).limit(1);
    projectId = data?.[0]?.id;
  }
  if (!projectId) throw new Error("Project not found.");

  const { data: columns } = await supabase.from("project_columns").select("id, name").eq("project_id", projectId).order("position");
  if (!columns?.length) throw new Error("No columns on this board.");

  const colMap: Record<string, string> = {};
  columns.forEach((c) => { colMap[c.name.toLowerCase()] = c.id; });

  const created: { id: string; title: string; column: string; priority: string; deduplicated?: boolean }[] = [];

  for (let i = 0; i < input.tasks.length; i++) {
    const t = input.tasks[i];

    if (t.source_message_id) {
      const { data: existing } = await supabase.from("tasks").select("id, title").eq("source_message_id", t.source_message_id).single();
      if (existing) { created.push({ id: existing.id, title: existing.title, column: "existing", priority: "existing", deduplicated: true }); continue; }
    }

    const colId = t.column ? (Object.entries(colMap).find(([n]) => n.includes(t.column!.toLowerCase()))?.[1] || columns[0].id) : columns[0].id;
    const clientId = t.client_name ? await resolveClientId(t.client_name) : null;
    const { data: lastTask } = await supabase.from("tasks").select("position").eq("column_id", colId).order("position", { ascending: false }).limit(1);

    const { data: task, error } = await supabase.from("tasks").insert({
      project_id: projectId, column_id: colId, client_id: clientId, title: t.title,
      description: t.description || null, priority: t.priority || "low", due_date: t.due_date || null,
      cost: t.cost || null, position: (lastTask?.[0]?.position || 0) + 1000 + i,
      created_by_agent: true, agent_run_id: input.agent_run_id || null, source_channel: input.source_channel || "api",
      source_message_id: t.source_message_id || null,
    }).select("id, title, column_id, priority").single();
    if (error) throw error;

    // Assignee
    if (t.assignee_name) {
      const memberId = await resolveMemberId(t.assignee_name);
      if (memberId) await supabase.from("task_assignees").insert({ task_id: task.id, user_id: memberId }).then(() => {});
    }

    // Tags
    if (t.tags?.length) {
      for (const tagName of t.tags) {
        let { data: tag } = await supabase.from("tags").select("id").eq("name", tagName).single();
        if (!tag) { const { data: newTag } = await supabase.from("tags").insert({ name: tagName, color: "gray" }).select("id").single(); tag = newTag; }
        if (tag) await supabase.from("task_tags").insert({ task_id: task.id, tag_id: tag.id }).then(() => {});
      }
    }

    created.push({ id: task.id, title: task.title, column: columns.find((c) => c.id === task.column_id)?.name || "Unknown", priority: task.priority });
  }

  const result = { project_id: projectId, tasks: created, message: `${created.filter((t) => !t.deduplicated).length} tasks created` };
  if (input.idempotency_key) await supabase.from("idempotency_keys").insert({ key: input.idempotency_key, entity_type: "task_batch", entity_id: projectId, response_json: result });
  await audit("tasks_created_by_agent", "project", projectId, input.agent_run_id, { count: created.length });
  return result;
}

// ─── Update task (all fields) ───────────────────────────────────────────────

export async function updateTaskByAgent(input: UpdateTaskInput) {
  const supabase = await createClient();
  const taskId = await resolveTaskId(input);
  const { data: task } = await supabase.from("tasks").select("id, project_id, column_id").eq("id", taskId).single();
  if (!task) throw new Error("Task not found");

  const updates: Record<string, unknown> = {};
  if (input.updates.title) updates.title = input.updates.title;
  if (input.updates.description !== undefined) updates.description = input.updates.description;
  if (input.updates.priority) updates.priority = input.updates.priority;
  if (input.updates.due_date !== undefined) updates.due_date = input.updates.due_date;
  if (input.updates.cost !== undefined) updates.cost = input.updates.cost;
  if (input.updates.is_completed !== undefined) {
    updates.is_completed = input.updates.is_completed;
    updates.completed_at = input.updates.is_completed ? new Date().toISOString() : null;
  }
  if (input.updates.column) {
    const colId = await resolveColumnId(task.project_id, input.updates.column);
    if (colId) updates.column_id = colId;
  }
  if (input.updates.client_name !== undefined) {
    updates.client_id = input.updates.client_name ? await resolveClientId(input.updates.client_name) : null;
  }

  const { data: updated, error } = await supabase.from("tasks").update(updates).eq("id", taskId).select("id, title, priority, due_date, cost, column_id, is_completed").single();
  if (error) throw error;

  const { data: col } = await supabase.from("project_columns").select("name").eq("id", updated.column_id).single();
  await audit("task_updated_by_agent", "task", taskId, input.agent_run_id, { updates: input.updates });
  return { task: { ...updated, column: col?.name }, message: `Task "${updated.title}" updated` };
}

// ─── Move task (column change) ──────────────────────────────────────────────

export async function moveTaskByAgent(input: MoveTaskInput) {
  const supabase = await createClient();
  const taskId = await resolveTaskId(input);
  const { data: task } = await supabase.from("tasks").select("id, project_id, title").eq("id", taskId).single();
  if (!task) throw new Error("Task not found");

  const colId = await resolveColumnId(task.project_id, input.column);
  if (!colId) throw new Error(`Column "${input.column}" not found`);

  const { data: lastTask } = await supabase.from("tasks").select("position").eq("column_id", colId).order("position", { ascending: false }).limit(1);
  await supabase.from("tasks").update({ column_id: colId, position: (lastTask?.[0]?.position || 0) + 1000 }).eq("id", taskId);

  const { data: col } = await supabase.from("project_columns").select("name").eq("id", colId).single();
  await audit("task_moved_by_agent", "task", taskId, input.agent_run_id, { to_column: col?.name });
  return { task_id: taskId, title: task.title, column: col?.name, message: `"${task.title}" moved to ${col?.name}` };
}

// ─── Delete task ────────────────────────────────────────────────────────────

export async function deleteTaskByAgent(input: DeleteTaskInput) {
  const supabase = await createClient();
  const taskId = await resolveTaskId(input);
  const { data: task } = await supabase.from("tasks").select("title").eq("id", taskId).single();
  await audit("task_deleted_by_agent", "task", taskId, input.agent_run_id);
  await supabase.from("tasks").delete().eq("id", taskId);
  return { task_id: taskId, message: `Task "${task?.title}" deleted` };
}

// ─── Add comment ────────────────────────────────────────────────────────────

export async function addCommentByAgent(input: AddCommentInput) {
  const supabase = await createClient();
  const taskId = await resolveTaskId(input);
  const { data, error } = await supabase.from("task_comments").insert({ task_id: taskId, body: `[OpenClaw] ${input.body}`, author_id: null }).select("id, body, created_at").single();
  if (error) throw error;
  await audit("comment_added_by_agent", "task", taskId, input.agent_run_id);
  return { comment: data, message: "Comment added" };
}

// ─── Manage tags ────────────────────────────────────────────────────────────

export async function manageTaskTags(input: ManageTagsInput) {
  const supabase = await createClient();
  const taskId = await resolveTaskId(input);
  const added: string[] = [];
  const removed: string[] = [];

  if (input.add_tags?.length) {
    for (const tagName of input.add_tags) {
      let { data: tag } = await supabase.from("tags").select("id").eq("name", tagName).single();
      if (!tag) { const { data: newTag } = await supabase.from("tags").insert({ name: tagName, color: "gray" }).select("id").single(); tag = newTag; }
      if (tag) { await supabase.from("task_tags").insert({ task_id: taskId, tag_id: tag.id }).then(() => {}); added.push(tagName); }
    }
  }
  if (input.remove_tags?.length) {
    for (const tagName of input.remove_tags) {
      const { data: tag } = await supabase.from("tags").select("id").eq("name", tagName).single();
      if (tag) { await supabase.from("task_tags").delete().eq("task_id", taskId).eq("tag_id", tag.id); removed.push(tagName); }
    }
  }

  await audit("tags_managed_by_agent", "task", taskId, input.agent_run_id, { added, removed });
  return { task_id: taskId, added, removed, message: `Tags: +${added.length} -${removed.length}` };
}

// ─── Manage assignees ───────────────────────────────────────────────────────

export async function manageTaskAssignees(input: ManageAssigneesInput) {
  const supabase = await createClient();
  const taskId = await resolveTaskId(input);
  const added: string[] = [];
  const removed: string[] = [];

  if (input.add_assignees?.length) {
    for (const name of input.add_assignees) {
      const memberId = await resolveMemberId(name);
      if (memberId) {
        await supabase.from("task_assignees").insert({ task_id: taskId, user_id: memberId }).then(() => {});
        added.push(name);
      }
    }
  }
  if (input.remove_assignees?.length) {
    for (const name of input.remove_assignees) {
      const memberId = await resolveMemberId(name);
      if (memberId) { await supabase.from("task_assignees").delete().eq("task_id", taskId).eq("user_id", memberId); removed.push(name); }
    }
  }

  await audit("assignees_managed_by_agent", "task", taskId, input.agent_run_id, { added, removed });
  return { task_id: taskId, added, removed, message: `Assignees: +${added.length} -${removed.length}` };
}

// ─── Add link ───────────────────────────────────────────────────────────────

export async function addLinkByAgent(input: AddLinkInput) {
  const supabase = await createClient();
  const taskId = await resolveTaskId(input);
  const { data, error } = await supabase.from("task_links").insert({ task_id: taskId, url: input.url, label: input.label || null }).select("id, url, label").single();
  if (error) throw error;
  await audit("link_added_by_agent", "task", taskId, input.agent_run_id);
  return { link: data, message: "Link added" };
}

// ─── Manage dependencies ────────────────────────────────────────────────────

export async function manageDependencies(input: ManageDependenciesInput) {
  const supabase = await createClient();
  const taskId = await resolveTaskId(input);
  const added: string[] = [];

  if (input.add_blocks?.length) {
    for (const ref of input.add_blocks) {
      const blockedId = await resolveTaskId({ task_title: ref });
      await supabase.from("task_dependencies").insert({ blocking_task_id: taskId, blocked_task_id: blockedId }).then(() => {});
      added.push(ref);
    }
  }
  if (input.add_blocked_by?.length) {
    for (const ref of input.add_blocked_by) {
      const blockingId = await resolveTaskId({ task_title: ref });
      await supabase.from("task_dependencies").insert({ blocking_task_id: blockingId, blocked_task_id: taskId }).then(() => {});
      added.push(ref);
    }
  }
  if (input.remove_dependency_ids?.length) {
    for (const depId of input.remove_dependency_ids) {
      await supabase.from("task_dependencies").delete().eq("id", depId);
    }
  }

  await audit("dependencies_managed_by_agent", "task", taskId, input.agent_run_id);
  return { task_id: taskId, added, removed_count: input.remove_dependency_ids?.length || 0, message: "Dependencies updated" };
}
