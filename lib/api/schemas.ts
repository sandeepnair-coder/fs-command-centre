import { z } from "zod";

// ─── Shared ─────────────────────────────────────────────────────────────────

const sourceChannel = z.enum(["whatsapp", "email", "slack", "manual", "api"]).optional();
const priority = z.enum(["low", "medium", "high", "urgent"]).default("low");
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const agentMeta = {
  source_channel: sourceChannel,
  source_message_id: z.string().max(500).optional(),
  agent_run_id: z.string().max(200).optional(),
  idempotency_key: z.string().max(500).optional(),
};
const taskOrMsg = {
  task_id: z.string().uuid().optional(),
  task_title: z.string().max(500).optional(),
  source_message_id: z.string().max(500).optional(),
};

// ═════════════════════════════════════════════════════════════════════════════
// PROJECT / BOARD TOOLS
// ═════════════════════════════════════════════════════════════════════════════

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  client_id: z.string().uuid({ message: "Valid client_id (UUID) is required. Use search-clients or upsert-client first." }),
  brand_name: z.string().max(200).optional(),
  due_date: dateStr,
  conversation_summary: z.string().max(5000).optional(),
  ...agentMeta,
  tasks: z.array(z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(2000).optional(),
    priority: priority,
    due_date: dateStr,
    column: z.string().max(100).optional(),
    assignee_name: z.string().max(200).optional(),
    tags: z.array(z.string().max(50)).optional(),
    cost: z.number().min(0).optional(),
  })).optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

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
}).refine(d => d.project_id || d.project_name, { message: "Either project_id or project_name required" });
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export const SearchProjectsSchema = z.object({
  query: z.string().max(200).optional(),
  client_name: z.string().max(200).optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});
export type SearchProjectsInput = z.infer<typeof SearchProjectsSchema>;

export const GetBoardContextSchema = z.object({
  project_id: z.string().uuid().optional(),
  project_name: z.string().max(200).optional(),
  include_tasks: z.boolean().default(true),
  include_columns: z.boolean().default(true),
}).refine(d => d.project_id || d.project_name, { message: "Either project_id or project_name required" });
export type GetBoardContextInput = z.infer<typeof GetBoardContextSchema>;

// ═════════════════════════════════════════════════════════════════════════════
// TASK TOOLS (full card access)
// ═════════════════════════════════════════════════════════════════════════════

export const CreateTasksSchema = z.object({
  project_id: z.string().uuid().optional(),
  project_name: z.string().max(200).optional(),
  client_id: z.string().uuid({ message: "Valid client_id required. Use search-clients first." }).optional(),
  tasks: z.array(z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(2000).optional(),
    priority: priority,
    due_date: dateStr,
    column: z.string().max(100).optional(),
    assignee_name: z.string().max(200).optional(),
    tags: z.array(z.string().max(50)).optional(),
    cost: z.number().min(0).optional(),
    source_message_id: z.string().max(500).optional(),
  })).min(1).max(50),
  ...agentMeta,
});
export type CreateTasksInput = z.infer<typeof CreateTasksSchema>;

export const UpdateTaskSchema = z.object({
  ...taskOrMsg,
  updates: z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(2000).nullable().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    cost: z.number().min(0).nullable().optional(),
    column: z.string().max(100).optional(),
    client_id: z.string().uuid().nullable().optional(),
    is_completed: z.boolean().optional(),
  }),
  agent_run_id: z.string().max(200).optional(),
}).refine(d => d.task_id || d.task_title || d.source_message_id, { message: "task_id, task_title, or source_message_id required" });
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const MoveTaskSchema = z.object({
  ...taskOrMsg,
  column: z.string().min(1).max(100),
  agent_run_id: z.string().max(200).optional(),
}).refine(d => d.task_id || d.task_title || d.source_message_id, { message: "task_id, task_title, or source_message_id required" });
export type MoveTaskInput = z.infer<typeof MoveTaskSchema>;

export const DeleteTaskSchema = z.object({
  ...taskOrMsg,
  agent_run_id: z.string().max(200).optional(),
}).refine(d => d.task_id || d.task_title || d.source_message_id, { message: "task_id, task_title, or source_message_id required" });
export type DeleteTaskInput = z.infer<typeof DeleteTaskSchema>;

// ─── Task sub-resources ─────────────────────────────────────────────────────

export const AddCommentSchema = z.object({
  ...taskOrMsg,
  body: z.string().min(1).max(5000),
  agent_run_id: z.string().max(200).optional(),
}).refine(d => d.task_id || d.task_title || d.source_message_id, { message: "task_id, task_title, or source_message_id required" });
export type AddCommentInput = z.infer<typeof AddCommentSchema>;

export const ManageTagsSchema = z.object({
  ...taskOrMsg,
  add_tags: z.array(z.string().max(50)).optional(),
  remove_tags: z.array(z.string().max(50)).optional(),
  agent_run_id: z.string().max(200).optional(),
}).refine(d => d.task_id || d.task_title || d.source_message_id, { message: "task_id, task_title, or source_message_id required" });
export type ManageTagsInput = z.infer<typeof ManageTagsSchema>;

export const ManageAssigneesSchema = z.object({
  ...taskOrMsg,
  add_assignees: z.array(z.string().max(200)).optional(),
  remove_assignees: z.array(z.string().max(200)).optional(),
  agent_run_id: z.string().max(200).optional(),
}).refine(d => d.task_id || d.task_title || d.source_message_id, { message: "task_id, task_title, or source_message_id required" });
export type ManageAssigneesInput = z.infer<typeof ManageAssigneesSchema>;

export const AddLinkSchema = z.object({
  ...taskOrMsg,
  url: z.string().url().max(2000),
  label: z.string().max(200).optional(),
  agent_run_id: z.string().max(200).optional(),
}).refine(d => d.task_id || d.task_title || d.source_message_id, { message: "task_id, task_title, or source_message_id required" });
export type AddLinkInput = z.infer<typeof AddLinkSchema>;

export const ManageDependenciesSchema = z.object({
  ...taskOrMsg,
  add_blocks: z.array(z.string().max(500)).optional(),
  add_blocked_by: z.array(z.string().max(500)).optional(),
  remove_dependency_ids: z.array(z.string().uuid()).optional(),
  agent_run_id: z.string().max(200).optional(),
}).refine(d => d.task_id || d.task_title || d.source_message_id, { message: "task_id, task_title, or source_message_id required" });
export type ManageDependenciesInput = z.infer<typeof ManageDependenciesSchema>;

// ═════════════════════════════════════════════════════════════════════════════
// CLIENT TOOLS (no finance)
// ═════════════════════════════════════════════════════════════════════════════

export const UpsertClientSchema = z.object({
  name: z.string().min(1).max(200),
  company_name: z.string().max(200).optional(),
  primary_email: z.string().email().max(300).optional(),
  website: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  timezone: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  agent_run_id: z.string().max(200).optional(),
  idempotency_key: z.string().max(500).optional(),
});
export type UpsertClientInput = z.infer<typeof UpsertClientSchema>;

export const UpdateClientSchema = z.object({
  client_id: z.string().uuid({ message: "client_id required" }),
  updates: z.object({
    name: z.string().max(200).optional(),
    company_name: z.string().max(200).nullable().optional(),
    primary_email: z.string().email().max(300).nullable().optional(),
    website: z.string().max(500).nullable().optional(),
    phone: z.string().max(50).nullable().optional(),
    timezone: z.string().max(50).nullable().optional(),
    industry: z.string().max(100).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
  }),
  agent_run_id: z.string().max(200).optional(),
});
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;

export const AddClientContactSchema = z.object({
  client_id: z.string().uuid({ message: "client_id required. Use search-clients first." }),
  name: z.string().min(1).max(200),
  role: z.string().max(100).optional(),
  email: z.string().email().max(300).optional(),
  phone: z.string().max(50).optional(),
  preferred_channel: z.enum(["email", "slack", "whatsapp"]).optional(),
  notes: z.string().max(2000).optional(),
  agent_run_id: z.string().max(200).optional(),
});
export type AddClientContactInput = z.infer<typeof AddClientContactSchema>;

export const AddClientFactSchema = z.object({
  client_id: z.string().uuid({ message: "client_id required. Use search-clients first." }),
  facts: z.array(z.object({
    key: z.string().min(1).max(100),
    value: z.string().min(1).max(2000),
    confidence: z.enum(["high", "medium", "low"]).default("medium"),
  })).min(1).max(30),
  agent_run_id: z.string().max(200).optional(),
});
export type AddClientFactInput = z.infer<typeof AddClientFactSchema>;

export const SearchClientsSchema = z.object({
  query: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});
export type SearchClientsInput = z.infer<typeof SearchClientsSchema>;

export const GetClientProfileSchema = z.object({
  client_id: z.string().uuid({ message: "client_id required" }),
  include_contacts: z.boolean().default(true),
  include_facts: z.boolean().default(true),
  include_projects: z.boolean().default(true),
});
export type GetClientProfileInput = z.infer<typeof GetClientProfileSchema>;

// ═════════════════════════════════════════════════════════════════════════════
// WORK STREAM TOOLS
// ═════════════════════════════════════════════════════════════════════════════

export const CreateWorkStreamSchema = z.object({
  client_id: z.string().uuid({ message: "client_id required" }),
  name: z.string().min(1).max(200),
  project_name: z.string().max(200).optional(),
  summary: z.string().max(2000).optional(),
  agent_run_id: z.string().max(200).optional(),
});
export type CreateWorkStreamInput = z.infer<typeof CreateWorkStreamSchema>;

// ═════════════════════════════════════════════════════════════════════════════
// COLUMN MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

export const ManageColumnsSchema = z.object({
  project_id: z.string().uuid().optional(),
  project_name: z.string().max(200).optional(),
  add_columns: z.array(z.string().min(1).max(100)).optional(),
  rename_columns: z.array(z.object({
    from: z.string().max(100),
    to: z.string().max(100),
  })).optional(),
  agent_run_id: z.string().max(200).optional(),
}).refine(d => d.project_id || d.project_name, { message: "Either project_id or project_name required" });
export type ManageColumnsInput = z.infer<typeof ManageColumnsSchema>;

// ═════════════════════════════════════════════════════════════════════════════
// LIST MEMBERS (for assignee resolution)
// ═════════════════════════════════════════════════════════════════════════════

export const ListMembersSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});
export type ListMembersInput = z.infer<typeof ListMembersSchema>;
