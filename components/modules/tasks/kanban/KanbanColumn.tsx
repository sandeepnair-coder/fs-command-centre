"use client";

import { useState, useRef } from "react";
import type { Task } from "@/lib/types/tasks";
import {
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MoreHorizontal,
  Plus,
  Trash2,
  Pencil,
  Info,
  FileText,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { KanbanCard } from "./KanbanCard";
import {
  updateColumn,
  deleteColumn,
  createTask,
  updateColumnMeta,
} from "@/app/(app)/tasks/actions";
import type { ProjectColumn, Subtask } from "@/lib/types/tasks";
import { toast } from "sonner";

export function KanbanColumn({
  column,
  projectId,
  clientId,
  setColumns,
  onTaskClick,
  columnIndex,
  totalColumns,
  onMoveColumn,
  subtasksMap,
  onToggleComplete,
}: {
  column: ProjectColumn;
  projectId: string;
  clientId: string | null;
  setColumns: React.Dispatch<React.SetStateAction<ProjectColumn[]>>;
  onTaskClick: (taskId: string) => void;
  columnIndex: number;
  totalColumns: number;
  onMoveColumn: (columnId: string, direction: "left" | "right") => void;
  subtasksMap?: Record<string, Subtask[]>;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
}) {
  const tasks = column.tasks || [];
  const taskIds = tasks.map((t) => t.id);
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(column.name);
  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Description popover state
  const [descOpen, setDescOpen] = useState(false);
  const [descValue, setDescValue] = useState(column.description ?? "");

  // ─── Column Name Edit ──────────────────────────────────────────────────

  async function saveName() {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === column.name) {
      setNameValue(column.name);
      return;
    }
    setColumns((prev) =>
      prev.map((c) => (c.id === column.id ? { ...c, name: trimmed } : c))
    );
    try {
      await updateColumn(column.id, trimmed);
    } catch {
      toast.error("Rename didn't go through. Try again?");
    }
  }

  // ─── Column Delete ─────────────────────────────────────────────────────

  async function handleDelete() {
    if (tasks.length > 0) {
      toast.error("Can't delete a column that has tasks. Move or remove them first.");
      return;
    }
    setColumns((prev) => prev.filter((c) => c.id !== column.id));
    try {
      await deleteColumn(column.id);
    } catch {
      toast.error("Couldn't delete that column. Try again in a sec.");
    }
  }

  // ─── Column Description ────────────────────────────────────────────────

  async function handleSaveDescription() {
    const val = descValue.trim() || null;
    setDescOpen(false);
    setColumns((prev) =>
      prev.map((c) => (c.id === column.id ? { ...c, description: val } : c))
    );
    try {
      await updateColumnMeta(column.id, { description: val });
    } catch {
      toast.error("Description didn't save. Try again?");
    }
  }

  // ─── Quick Add Task ────────────────────────────────────────────────────

  async function handleAddTask() {
    const trimmed = taskTitle.trim();
    if (!trimmed) return;
    setTaskTitle("");
    setAddingTask(false);

    // Optimistic: add a temporary card instantly
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = {
      id: tempId,
      project_id: projectId,
      column_id: column.id,
      title: trimmed,
      priority: "medium" as const,
      position: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setColumns((prev) =>
      prev.map((c) =>
        c.id === column.id
          ? { ...c, tasks: [...(c.tasks || []), optimisticTask as Task] }
          : c
      )
    );

    try {
      if (!clientId) {
        toast.error("No client linked to this board. Select a client for the project first.");
        setColumns((prev) => prev.map((c) => c.id === column.id ? { ...c, tasks: (c.tasks || []).filter((t) => t.id !== tempId) } : c));
        return;
      }
      const task = await createTask(projectId, column.id, trimmed, { client_id: clientId });
      // Replace temp card with real one
      setColumns((prev) =>
        prev.map((c) =>
          c.id === column.id
            ? { ...c, tasks: (c.tasks || []).map((t) => t.id === tempId ? task : t) }
            : c
        )
      );
    } catch {
      // Remove the optimistic card on failure
      setColumns((prev) =>
        prev.map((c) =>
          c.id === column.id
            ? { ...c, tasks: (c.tasks || []).filter((t) => t.id !== tempId) }
            : c
        )
      );
      toast.error("That task didn't save. Give it another shot.");
    }
  }

  return (
    <Card
      className={`w-[280px] flex-shrink-0 flex flex-col h-full rounded-xl shadow-none ${
        isOver ? "ring-2 ring-primary/30" : ""
      }`}
    >
      {/* ─── Header ─── */}
      <CardHeader className="px-3 py-2 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {editingName ? (
            <Input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") {
                  setNameValue(column.name);
                  setEditingName(false);
                }
              }}
              className="h-7 w-full rounded-md bg-transparent px-1 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
          ) : (
            <span
              className="text-sm font-semibold truncate cursor-pointer hover:text-primary"
              onDoubleClick={() => setEditingName(true)}
            >
              {column.name}
            </span>
          )}
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {tasks.length}
          </span>
          {column.description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground flex-shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="text-xs">{column.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Column actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingName(true)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setDescValue(column.description ?? "");
              setDescOpen(true);
            }}>
              <FileText className="mr-2 h-3.5 w-3.5" />
              Set Description
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onMoveColumn(column.id, "left")}
              disabled={columnIndex === 0}
            >
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              Move Left
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onMoveColumn(column.id, "right")}
              disabled={columnIndex === totalColumns - 1}
            >
              <ArrowRight className="mr-2 h-3.5 w-3.5" />
              Move Right
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete Column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Description Popover */}
        <Popover open={descOpen} onOpenChange={setDescOpen}>
          <PopoverTrigger asChild>
            <span className="hidden" />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-2">
              <p className="text-sm font-medium">Column Description</p>
              <Input
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                placeholder="What goes in this column?"
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveDescription();
                  if (e.key === "Escape") setDescOpen(false);
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-7" onClick={handleSaveDescription}>
                  Save
                </Button>
                <Button variant="ghost" size="sm" className="h-7" onClick={() => setDescOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </CardHeader>

      {/* ─── Body (droppable area — scrollable) ─── */}
      <CardContent className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
        <div ref={setNodeRef} className="min-h-[60px]">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task.id)}
                  subtasks={subtasksMap?.[task.id]}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      </CardContent>

      {/* ─── Footer ─── */}
      <div className="px-2 pb-2">
        {addingTask ? (
          <div className="space-y-1.5">
            <Input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="What needs doing?"
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTask();
                if (e.key === "Escape") {
                  setAddingTask(false);
                  setTaskTitle("");
                }
              }}
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7" onClick={handleAddTask}>
                Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => {
                  setAddingTask(false);
                  setTaskTitle("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 justify-start text-muted-foreground"
            onClick={() => setAddingTask(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add card
          </Button>
        )}
      </div>
    </Card>
  );
}
