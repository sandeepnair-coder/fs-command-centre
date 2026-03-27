"use server";

import { createClient } from "@/lib/supabase/server";
import type { Tag, TaskDependency } from "@/lib/types/tasks";

// ─── Tags ───────────────────────────────────────────────────────────────────

export async function getAllTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").select("id, name, color").order("name").limit(100);
  if (error) throw error;
  return (data || []) as Tag[];
}

export async function createTag(name: string, color: string): Promise<Tag> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({ name: name.trim(), color })
    .select()
    .single();
  if (error) throw error;
  return data as Tag;
}

export async function getTaskTags(taskId: string): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_tags")
    .select("*, tags(*)")
    .eq("task_id", taskId);
  if (error) throw error;
  return (data || []).map((tt: { tags: Tag }) => tt.tags).filter(Boolean);
}

export async function addTagToTask(taskId: string, tagId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_tags")
    .insert({ task_id: taskId, tag_id: tagId });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

export async function removeTagFromTask(taskId: string, tagId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_tags")
    .delete()
    .eq("task_id", taskId)
    .eq("tag_id", tagId);
  if (error) throw error;
}

// ─── Dependencies ───────────────────────────────────────────────────────────

export async function getTaskDependencies(taskId: string) {
  const supabase = await createClient();

  const [blockingRes, blockedRes] = await Promise.all([
    // Tasks that block this task (this task is blocked BY them)
    supabase
      .from("task_dependencies")
      .select("*, blocking_task:blocking_task_id(id, title, is_completed)")
      .eq("blocked_task_id", taskId),
    // Tasks that this task blocks (this task is BLOCKING them)
    supabase
      .from("task_dependencies")
      .select("*, blocked_task:blocked_task_id(id, title, is_completed)")
      .eq("blocking_task_id", taskId),
  ]);

  return {
    blockedBy: (blockingRes.data || []) as TaskDependency[],
    blocking: (blockedRes.data || []) as TaskDependency[],
  };
}

export async function addDependency(blockingTaskId: string, blockedTaskId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("task_dependencies")
    .insert({
      blocking_task_id: blockingTaskId,
      blocked_task_id: blockedTaskId,
      created_by: null,
    })
    .select("*, blocking_task:blocking_task_id(id, title, is_completed), blocked_task:blocked_task_id(id, title, is_completed)")
    .single();
  if (error) throw error;
  return data as TaskDependency;
}

export async function removeDependency(depId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("task_dependencies").delete().eq("id", depId);
  if (error) throw error;
}

// ─── Task Completion ────────────────────────────────────────────────────────

export async function toggleTaskComplete(taskId: string, completed: boolean) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    is_completed: completed,
    completed_at: completed ? new Date().toISOString() : null,
    completed_by: null,
  };

  const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
  if (error) throw error;
}

// ─── Search tasks (for dependency picker) ───────────────────────────────────

export async function searchProjectTasks(projectId: string, query: string, excludeTaskId?: string) {
  const supabase = await createClient();
  let q = supabase
    .from("tasks")
    .select("id, title, is_completed")
    .eq("project_id", projectId)
    .ilike("title", `%${query}%`)
    .limit(10);

  if (excludeTaskId) q = q.neq("id", excludeTaskId);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
