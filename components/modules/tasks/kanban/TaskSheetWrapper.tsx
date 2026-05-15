"use client";

import dynamic from "next/dynamic";
import type { ProjectColumn, Subtask, Task } from "@/lib/types/tasks";

const TaskSheet = dynamic(() => import("./TaskSheet").then((m) => ({ default: m.TaskSheet })), { ssr: false });

export function TaskSheetWrapper({
  taskId,
  columns,
  profiles,
  clients,
  onClose,
  setColumns,
  subtasksMap,
  onSubtasksChange,
}: {
  taskId: string | null;
  columns: ProjectColumn[];
  profiles: { id: string; full_name: string; avatar_url: string | null; avatar_color: string | null }[];
  clients: { id: string; name: string }[];
  onClose: () => void;
  setColumns: React.Dispatch<React.SetStateAction<ProjectColumn[]>>;
  subtasksMap: Record<string, Subtask[]>;
  onSubtasksChange: (taskId: string, subtasks: Subtask[]) => void;
}) {
  // Find the task from columns for instant rendering
  const initialTask = taskId
    ? columns.flatMap((c) => c.tasks || []).find((t) => t.id === taskId) ?? null
    : null;

  function handleTaskUpdated(updatedTask: Task) {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: (col.tasks || []).map((t) =>
          t.id === updatedTask.id ? { ...t, ...updatedTask } : t
        ),
      }))
    );
  }

  function handleTaskDeleted(deletedId: string) {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: (col.tasks || []).filter((t) => t.id !== deletedId),
      }))
    );
    onClose();
  }

  function handleTaskStatusChanged(movedTaskId: string, newColumnId: string) {
    let movedTask: Task | null = null;
    setColumns((prev) => {
      const updated = prev.map((col) => ({
        ...col,
        tasks: (col.tasks || []).filter((t) => {
          if (t.id === movedTaskId) {
            movedTask = { ...t, column_id: newColumnId };
            return false;
          }
          return true;
        }),
      }));
      if (movedTask) {
        return updated.map((col) =>
          col.id === newColumnId
            ? { ...col, tasks: [...(col.tasks || []), movedTask!] }
            : col
        );
      }
      return updated;
    });
  }

  return (
    <TaskSheet
      taskId={taskId}
      initialTask={initialTask}
      columns={columns}
      profiles={profiles}
      clients={clients}
      onClose={onClose}
      onTaskUpdated={handleTaskUpdated}
      onTaskStatusChanged={handleTaskStatusChanged}
      onTaskDeleted={handleTaskDeleted}
      subtasksMap={subtasksMap}
      onSubtasksChange={onSubtasksChange}
    />
  );
}
