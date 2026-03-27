import type { Subtask } from "@/lib/types/tasks";

const STORAGE_KEY = "fs_task_subtasks";

function getAll(): Record<string, Subtask[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist(data: Record<string, Subtask[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getSubtasks(taskId: string): Subtask[] {
  return getAll()[taskId] || [];
}

export function setSubtasks(taskId: string, subtasks: Subtask[]) {
  const all = getAll();
  all[taskId] = subtasks;
  persist(all);
}

export function addSubtask(taskId: string, title: string): Subtask {
  const subtask: Subtask = { id: crypto.randomUUID(), title, completed: false };
  const current = getSubtasks(taskId);
  setSubtasks(taskId, [...current, subtask]);
  return subtask;
}

export function toggleSubtask(taskId: string, subtaskId: string) {
  const current = getSubtasks(taskId);
  setSubtasks(
    taskId,
    current.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s))
  );
}

export function removeSubtask(taskId: string, subtaskId: string) {
  const current = getSubtasks(taskId);
  setSubtasks(
    taskId,
    current.filter((s) => s.id !== subtaskId)
  );
}

export function updateSubtaskTitle(taskId: string, subtaskId: string, title: string) {
  const current = getSubtasks(taskId);
  setSubtasks(
    taskId,
    current.map((s) => (s.id === subtaskId ? { ...s, title } : s))
  );
}
