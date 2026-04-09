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
} from "@/app/(app)/tasks/actions";
import { cn } from "@/lib/utils";

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

  const completed = subtasks.filter((s) => s.completed).length;
  const total = subtasks.length;
  const percent = total > 0 ? (completed / total) * 100 : 0;

  async function handleAdd() {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setNewTitle("");
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    onUpdate([...subtasks, { id: tempId, title: trimmed, completed: false }]);
    try {
      const created = await createSubtask(taskId, trimmed);
      onUpdate([...subtasks, { id: created.id, title: created.title, completed: created.completed }]);
    } catch {
      // Revert on failure
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

      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-center gap-2 group rounded-md px-1 py-1 hover:bg-muted/50"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />
            <button
              onClick={() => handleToggle(subtask.id)}
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
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleEditSave(subtask.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditSave(subtask.id);
                  if (e.key === "Escape") setEditingId(null);
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
                onDoubleClick={() => {
                  setEditingId(subtask.id);
                  setEditValue(subtask.title);
                }}
              >
                {subtask.title}
              </span>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
              onClick={() => handleRemove(subtask.id)}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>

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
