import { z } from "zod";

// ─── Shared ─────────────────────────────────────────────────────────────────

const sourceChannel = z.enum(["whatsapp", "email", "slack", "manual", "api"]).optional();
const priority = z.enum(["low", "medium", "high", "urgent"]).default("low");

// ─── Tool: create_project_from_client_message ───────────────────────────────

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  client_name: z.string().min(1).max(200),
  brand_name: z.string().max(200).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  conversation_summary: z.string().max(5000).optional(),
  source_channel: sourceChannel,
  source_message_id: z.string().max(500).optional(),
  agent_run_id: z.string().max(200).optional(),
  idempotency_key: z.string().max(500).optional(),
  tasks: z.array(z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(2000).optional(),
    priority: priority,
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    column: z.string().max(100).optional(),
  })).optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

// ─── Tool: create_tasks_for_project ─────────────────────────────────────────

export const CreateTasksSchema = z.object({
  project_id: z.string().uuid().optional(),
  project_name: z.string().max(200).optional(),
  tasks: z.array(z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(2000).optional(),
    priority: priority,
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    column: z.string().max(100).optional(),
    client_name: z.string().max(200).optional(),
    source_message_id: z.string().max(500).optional(),
  })).min(1).max(50),
  source_channel: sourceChannel,
  agent_run_id: z.string().max(200).optional(),
  idempotency_key: z.string().max(500).optional(),
});
export type CreateTasksInput = z.infer<typeof CreateTasksSchema>;

// ─── Tool: update_task ──────────────────────────────────────────────────────

export const UpdateTaskSchema = z.object({
  task_id: z.string().uuid().optional(),
  source_message_id: z.string().max(500).optional(),
  updates: z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(2000).nullable().optional(),
    priority: priority.optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    column: z.string().max(100).optional(),
    status: z.string().max(100).optional(),
  }),
  agent_run_id: z.string().max(200).optional(),
}).refine(d => d.task_id || d.source_message_id, { message: "Either task_id or source_message_id is required" });
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

// ─── Tool: update_project_status ────────────────────────────────────────────

export const UpdateProjectSchema = z.object({
  project_id: z.string().uuid().optional(),
  project_name: z.string().max(200).optional(),
  updates: z.object({
    name: z.string().max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    conversation_summary: z.string().max(5000).optional(),
  }),
  agent_run_id: z.string().max(200).optional(),
}).refine(d => d.project_id || d.project_name, { message: "Either project_id or project_name is required" });
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

// ─── Tool: search_existing_projects ─────────────────────────────────────────

export const SearchProjectsSchema = z.object({
  query: z.string().max(200).optional(),
  client_name: z.string().max(200).optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});
export type SearchProjectsInput = z.infer<typeof SearchProjectsSchema>;

// ─── Tool: get_board_context ────────────────────────────────────────────────

export const GetBoardContextSchema = z.object({
  project_id: z.string().uuid().optional(),
  project_name: z.string().max(200).optional(),
  include_tasks: z.boolean().default(true),
  include_columns: z.boolean().default(true),
}).refine(d => d.project_id || d.project_name, { message: "Either project_id or project_name is required" });
export type GetBoardContextInput = z.infer<typeof GetBoardContextSchema>;

// ─── Tool: add_comment_to_card ──────────────────────────────────────────────

export const AddCommentSchema = z.object({
  task_id: z.string().uuid().optional(),
  source_message_id: z.string().max(500).optional(),
  body: z.string().min(1).max(5000),
  agent_run_id: z.string().max(200).optional(),
}).refine(d => d.task_id || d.source_message_id, { message: "Either task_id or source_message_id is required" });
export type AddCommentInput = z.infer<typeof AddCommentSchema>;
