"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { TaskSheet } from "./TaskSheet";
import { moveTask, swapColumnPositions } from "@/app/(app)/tasks/actions";
import { getInsertPosition } from "@/lib/tasks/position";
import { toggleTaskComplete } from "@/app/(app)/tasks/tag-actions";
import type { ProjectColumn, Task, Subtask } from "@/lib/types/tasks";
import { toast } from "sonner";

export function KanbanBoard({
  projectId,
  clientId,
  columns,
  setColumns,
  subtasksMap,
  onSubtasksChange,
  profiles,
  clients,
}: {
  projectId: string;
  clientId: string | null;
  columns: ProjectColumn[];
  setColumns: React.Dispatch<React.SetStateAction<ProjectColumn[]>>;
  subtasksMap: Record<string, Subtask[]>;
  onSubtasksChange: (taskId: string, subtasks: Subtask[]) => void;
  profiles: { id: string; full_name: string; avatar_url: string | null; avatar_color: string | null }[];
  clients: { id: string; name: string }[];
}) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Find the full task object from columns for instant sheet rendering
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    for (const col of columns) {
      const t = (col.tasks || []).find((t) => t.id === selectedTaskId);
      if (t) return t;
    }
    return null;
  }, [selectedTaskId, columns]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);


  // ─── Find which column contains a task ─────────────────────────────────

  function findColumnByTaskId(taskId: string): ProjectColumn | undefined {
    return columns.find((c) => (c.tasks || []).some((t) => t.id === taskId));
  }

  // ─── Drag Start ────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  }

  // ─── Drag Over (live preview of cross-column moves) ────────────────────

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceCol = findColumnByTaskId(activeId);
    const overCol =
      columns.find((c) => c.id === overId) || findColumnByTaskId(overId);

    if (!sourceCol || !overCol || sourceCol.id === overCol.id) return;

    setColumns((prev) => {
      const sourceTasks = [...(prev.find((c) => c.id === sourceCol.id)?.tasks || [])];
      const destTasks = [...(prev.find((c) => c.id === overCol.id)?.tasks || [])];

      const taskIdx = sourceTasks.findIndex((t) => t.id === activeId);
      if (taskIdx === -1) return prev;

      const [movedTask] = sourceTasks.splice(taskIdx, 1);
      const overIdx = destTasks.findIndex((t) => t.id === overId);
      const insertIdx = overIdx >= 0 ? overIdx : destTasks.length;
      destTasks.splice(insertIdx, 0, { ...movedTask, column_id: overCol.id });

      return prev.map((c) => {
        if (c.id === sourceCol.id) return { ...c, tasks: sourceTasks };
        if (c.id === overCol.id) return { ...c, tasks: destTasks };
        return c;
      });
    });
  }

  // ─── Drag End (persist) ────────────────────────────────────────────────

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;

    const destCol = findColumnByTaskId(activeId);
    if (!destCol) return;

    const tasks = destCol.tasks || [];
    const taskIndex = tasks.findIndex((t) => t.id === activeId);

    const beforePos = taskIndex > 0 ? tasks[taskIndex - 1].position : null;
    const afterPos =
      taskIndex < tasks.length - 1 ? tasks[taskIndex + 1].position : null;
    const newPosition = getInsertPosition(beforePos, afterPos);

    setColumns((prev) =>
      prev.map((c) => {
        if (c.id !== destCol.id) return c;
        return {
          ...c,
          tasks: (c.tasks || []).map((t) =>
            t.id === activeId ? { ...t, position: newPosition } : t
          ),
        };
      })
    );

    const prevColumns = columns;
    moveTask(activeId, destCol.id, newPosition).catch(() => {
      setColumns(prevColumns);
      toast.error("Drag didn't stick. Try moving it again.");
    });
  }

  // ─── Task Updated from Sheet ───────────────────────────────────────────

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

  function handleTaskDeleted(taskId: string) {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: (col.tasks || []).filter((t) => t.id !== taskId),
      }))
    );
    setSelectedTaskId(null);
  }

  function handleTaskStatusChanged(taskId: string, newColumnId: string) {
    let movedTask: Task | null = null;
    setColumns((prev) => {
      const updated = prev.map((col) => ({
        ...col,
        tasks: (col.tasks || []).filter((t) => {
          if (t.id === taskId) {
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

  // ─── Move Column Left/Right ────────────────────────────────────────────

  function handleMoveColumn(columnId: string, direction: "left" | "right") {
    const idx = columns.findIndex((c) => c.id === columnId);
    if (idx < 0) return;
    const swapIdx = direction === "left" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= columns.length) return;

    const colA = columns[idx];
    const colB = columns[swapIdx];
    const prevColumns = columns;

    // Optimistic: swap positions in local state
    setColumns((prev) => {
      const next = [...prev];
      next[idx] = { ...colB, position: colA.position };
      next[swapIdx] = { ...colA, position: colB.position };
      return next;
    });

    swapColumnPositions(colA.id, colA.position, colB.id, colB.position).catch(() => {
      setColumns(prevColumns);
      toast.error("Column didn't budge. Try again?");
    });
  }

  // ─── Toggle Task Completion ────────────────────────────────────────────

  function handleToggleComplete(taskId: string, completed: boolean) {
    // Optimistic update
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: (col.tasks || []).map((t) =>
          t.id === taskId ? { ...t, is_completed: completed } as Task : t
        ),
      }))
    );
    toggleTaskComplete(taskId, completed).catch(() => {
      toast.error("Couldn't update completion status.");
    });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="w-full flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
          <div
            className="flex gap-4 pb-4 pt-1 px-1 h-full"
            style={{ minWidth: "max-content" }}
          >
            <SortableContext
              items={columnIds}
              strategy={horizontalListSortingStrategy}
            >
              {columns.map((col, idx) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  projectId={projectId}
                  clientId={clientId}
                  setColumns={setColumns}
                  onTaskClick={setSelectedTaskId}
                  columnIndex={idx}
                  totalColumns={columns.length}
                  onMoveColumn={handleMoveColumn}
                  subtasksMap={subtasksMap}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </SortableContext>
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[260px]">
              <KanbanCard
                task={activeTask}
                overlay
                subtasks={subtasksMap[activeTask.id]}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskSheet
        taskId={selectedTaskId}
        initialTask={selectedTask}
        columns={columns}
        profiles={profiles}
        clients={clients}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={handleTaskUpdated}
        onTaskStatusChanged={handleTaskStatusChanged}
        onTaskDeleted={handleTaskDeleted}
        subtasksMap={subtasksMap}
        onSubtasksChange={onSubtasksChange}
      />
    </div>
  );
}
