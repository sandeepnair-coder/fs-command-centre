export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type ProjectColumn = {
  id: string;
  project_id: string;
  name: string;
  position: number;
  wip_limit: number | null;
  description: string | null;
  created_at: string;
  tasks?: Task[];
};

export type Task = {
  id: string;
  project_id: string;
  column_id: string;
  client_id: string | null;
  work_stream_id: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_date: string | null;
  cost: number | null;
  position: number;
  created_by: string | null;
  created_from_message_id: string | null;
  created_from_conversation_id: string | null;
  created_at: string;
  updated_at: string;
  manager_id: string | null;
  assignees?: TaskAssignee[];
  client_name?: string | null;
  manager_name?: string | null;
  work_stream_name?: string | null;
  comments_count?: number;
  attachments_count?: number;
  links_count?: number;
  relations_count?: number;
  subtasks?: Subtask[];
};

export type TaskAssignee = {
  task_id: string;
  user_id: string;
  profiles?: { full_name: string; avatar_url: string | null; avatar_color: string | null };
};

export type TaskComment = {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles?: { full_name: string; avatar_url: string | null; avatar_color: string | null };
};

export type TaskAttachment = {
  id: string;
  task_id: string;
  storage_path: string;
  file_name: string;
  created_at: string;
  url?: string;
};

export type TaskLink = {
  id: string;
  task_id: string;
  url: string;
  label: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  avatar_color: string | null;
};

// ─── Tags ────────────────────────────────────────────────────────────────────

export type Tag = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

export type TaskTag = {
  id: string;
  task_id: string;
  tag_id: string;
  tags?: Tag;
};

// ─── Dependencies ────────────────────────────────────────────────────────────

export type TaskDependency = {
  id: string;
  blocking_task_id: string;
  blocked_task_id: string;
  created_at: string;
  // Joined
  blocking_task?: { id: string; title: string; is_completed?: boolean };
  blocked_task?: { id: string; title: string; is_completed?: boolean };
};

// ─── Activity Log ────────────────────────────────────────────────────────────

export type TaskActivity = {
  id: string;
  task_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

export const TAG_COLORS = [
  { name: "gray", bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", dot: "bg-gray-500" },
  { name: "red", bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  { name: "orange", bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  { name: "amber", bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  { name: "green", bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  { name: "blue", bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  { name: "violet", bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  { name: "pink", bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
] as const;

// ─── Subtasks (stored in localStorage until DB migration) ────────────────────

export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

// ─── Filter / View types ─────────────────────────────────────────────────────

export type ViewMode = "kanban" | "list" | "calendar" | "client" | "stream";

export type TaskFilters = {
  search: string;
  priority: TaskPriority | "all";
  assignee: string | "all";
  manager: string | "all";
  dueDate: "all" | "overdue" | "this_week" | "this_month" | "no_date";
  client: string | "all";
};
