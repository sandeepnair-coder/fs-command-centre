import { isAfter, isBefore, startOfDay, endOfWeek, endOfMonth, startOfWeek, startOfMonth } from "date-fns";
import type { Task, TaskFilters, ProjectColumn } from "@/lib/types/tasks";

export const DEFAULT_FILTERS: TaskFilters = {
  search: "",
  priority: "all",
  assignee: "all",
  dueDate: "all",
  client: "all",
};

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter((task) => {
    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchClient = task.client_name?.toLowerCase().includes(q);
      const matchAssignee = task.assignees?.some((a) =>
        a.profiles?.full_name?.toLowerCase().includes(q)
      );
      if (!matchTitle && !matchClient && !matchAssignee) return false;
    }

    // Priority
    if (filters.priority !== "all" && task.priority !== filters.priority) return false;

    // Assignee
    if (filters.assignee !== "all") {
      if (!task.assignees?.some((a) => a.user_id === filters.assignee)) return false;
    }

    // Due date
    if (filters.dueDate !== "all") {
      const today = startOfDay(new Date());
      if (filters.dueDate === "no_date") {
        if (task.due_date) return false;
      } else if (!task.due_date) {
        return false;
      } else {
        const due = startOfDay(new Date(task.due_date));
        switch (filters.dueDate) {
          case "overdue":
            if (!isBefore(due, today)) return false;
            break;
          case "this_week":
            if (isBefore(due, startOfWeek(today, { weekStartsOn: 1 })) || isAfter(due, endOfWeek(today, { weekStartsOn: 1 }))) return false;
            break;
          case "this_month":
            if (isBefore(due, startOfMonth(today)) || isAfter(due, endOfMonth(today))) return false;
            break;
        }
      }
    }

    // Client
    if (filters.client !== "all") {
      if (task.client_id !== filters.client) return false;
    }

    return true;
  });
}

export function filterColumns(columns: ProjectColumn[], filters: TaskFilters): ProjectColumn[] {
  return columns.map((col) => ({
    ...col,
    tasks: filterTasks(col.tasks || [], filters),
  }));
}

export function getAllTasks(columns: ProjectColumn[]): Task[] {
  return columns.flatMap((c) => c.tasks || []);
}

export function getActiveFilterCount(filters: TaskFilters): number {
  let count = 0;
  if (filters.search) count++;
  if (filters.priority !== "all") count++;
  if (filters.assignee !== "all") count++;
  if (filters.dueDate !== "all") count++;
  if (filters.client !== "all") count++;
  return count;
}
