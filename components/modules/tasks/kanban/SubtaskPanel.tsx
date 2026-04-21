"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { Subtask } from "@/lib/types/tasks";
import {
  createSubtask,
  updateSubtaskAction,
  deleteSubtask,
  reorderSubtasks,
} from "@/app/(app)/tasks/actions";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableSubtaskItem({
  subtask,
  onToggle,
  onRemove,
  onEditStart,
  editingId,
  editValue,
  onEditChange,
  onEditSave,
  onEditCancel,
}: {
  subtask: Subtask;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEditStart: (id: string, title: string) => void;
  editingId: string | null;
  editValue: string;
  onEditChange: (v: string) => void;
  onEditSave: (id: string) => void;
  onEditCancel: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 group rounded-md px-1 py-1 hover:bg-muted/50",
        isDragging && "opacity-50 bg-muted/50 z-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/30" />
      </button>
      <button
        onClick={() => onToggle(subtask.id)}
        className={cn(
          "h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-colors",
          subtask.completed
            ? "bg-primary border-primary text-primary-foreground"
            : "border-border hover:border-primary"
        )}
        aria-label={subtask.completed ? "Mark incomplete" : "Mark complete"}
      >
        {subtask.completed && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {editingId === subtask.id ? (
        <Input
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={() => onEditSave(subtask.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEditSave(subtask.id);
            if (e.key === "Escape") onEditCancel();
          }}
          className="h-6 text-sm flex-1"
          autoFocus
        />
      ) : (
        <span
          className={cn(
            "text-sm flex-1 cursor-pointer",
            subtask.completed && "line-through text-muted-foreground"
          )}
          onDoubleClick={() => onEditStart(subtask.id, subtask.title)}
        >
          {subtask.title}
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
        onClick={() => onRemove(subtask.id)}
      >
        <Trash2 className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
  );
}

export function SubtaskPanel({
  taskId,
  subtasks,
  onUpdate,
}: {
  taskId: string;
  subtasks: Subtask[];
  onUpdate: (subtasks: Subtask[]) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const completed = subtasks.filter((s) => s.completed).length;
  const total = subtasks.length;
  const percent = total > 0 ? (completed / total) * 100 : 0;

  async function handleAdd() {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setNewTitle("");
    const tempId = `temp-${Date.now()}`;
    onUpdate([...subtasks, { id: tempId, title: trimmed, completed: false }]);
    try {
      const created = await createSubtask(taskId, trimmed);
      onUpdate([...subtasks, { id: created.id, title: created.title, completed: created.completed }]);
    } catch {
      onUpdate(subtasks);
    }
  }

  async function handleToggle(subtaskId: string) {
    const target = subtasks.find((s) => s.id === subtaskId);
    if (!target) return;
    onUpdate(
      subtasks.map((s) =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      )
    );
    try {
      await updateSubtaskAction(subtaskId, { completed: !target.completed });
    } catch {
      onUpdate(subtasks);
    }
  }

  async function handleRemove(subtaskId: string) {
    onUpdate(subtasks.filter((s) => s.id !== subtaskId));
    try {
      await deleteSubtask(subtaskId);
    } catch {
      onUpdate(subtasks);
    }
  }

  async function handleEditSave(subtaskId: string) {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    onUpdate(
      subtasks.map((s) =>
        s.id === subtaskId ? { ...s, title: trimmed } : s
      )
    );
    setEditingId(null);
    try {
      await updateSubtaskAction(subtaskId, { title: trimmed });
    } catch {
      onUpdate(subtasks);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = subtasks.findIndex((s) => s.id === active.id);
    const newIndex = subtasks.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...subtasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    onUpdate(reordered);
    try {
      await reorderSubtasks(reordered.map((s) => s.id));
    } catch {
      onUpdate(subtasks);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Subtasks</h4>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {completed}/{total} done
          </span>
        )}
      </div>

      {total > 0 && (
        <Progress
          value={percent}
          className={cn(
            "h-1.5",
            percent > 75 ? "[&>[data-slot=progress-indicator]]:bg-emerald-500"
              : percent >= 25 ? "[&>[data-slot=progress-indicator]]:bg-amber-500"
              : "[&>[data-slot=progress-indicator]]:bg-red-500"
          )}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={subtasks.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {subtasks.map((subtask) => (
              <SortableSubtaskItem
                key={subtask.id}
                subtask={subtask}
                onToggle={handleToggle}
                onRemove={handleRemove}
                onEditStart={(id, title) => {
                  setEditingId(id);
                  setEditValue(title);
                }}
                editingId={editingId}
                editValue={editValue}
                onEditChange={setEditValue}
                onEditSave={handleEditSave}
                onEditCancel={() => setEditingId(null)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Separator />

      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="What's the next small step?"
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <Button size="sm" className="h-8 shrink-0" onClick={handleAdd} disabled={!newTitle.trim()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
