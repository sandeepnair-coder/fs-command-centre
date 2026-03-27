"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, X, Lock, Link2 } from "lucide-react";
import type { TaskDependency } from "@/lib/types/tasks";
import {
  getTaskDependencies,
  addDependency,
  removeDependency,
  searchProjectTasks,
} from "@/app/(app)/tasks/tag-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function DependencySection({
  taskId,
  projectId,
}: {
  taskId: string;
  projectId: string;
}) {
  const [blockedBy, setBlockedBy] = useState<TaskDependency[]>([]);
  const [blocking, setBlocking] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTaskDependencies(taskId)
      .then(({ blockedBy: bb, blocking: bl }) => {
        setBlockedBy(bb);
        setBlocking(bl);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskId]);

  async function handleRemove(depId: string) {
    try {
      await removeDependency(depId);
      setBlockedBy((prev) => prev.filter((d) => d.id !== depId));
      setBlocking((prev) => prev.filter((d) => d.id !== depId));
    } catch {
      toast.error("Couldn't remove dependency.");
    }
  }

  async function handleAddBlockedBy(blockingTaskId: string, blockingTitle: string) {
    try {
      const dep = await addDependency(blockingTaskId, taskId);
      setBlockedBy((prev) => [...prev, dep]);
    } catch {
      toast.error("Couldn't add dependency.");
    }
  }

  async function handleAddBlocking(blockedTaskId: string) {
    try {
      const dep = await addDependency(taskId, blockedTaskId);
      setBlocking((prev) => [...prev, dep]);
    } catch {
      toast.error("Couldn't add dependency.");
    }
  }

  if (loading) return <p className="text-xs text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-3">
      {/* Blocked by */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
          <Lock className="h-3 w-3" /> Blocked by
        </p>
        <div className="space-y-1">
          {blockedBy.map((dep) => (
            <div key={dep.id} className="flex items-center gap-1.5 group">
              <span className={cn(
                "text-xs flex-1 truncate",
                dep.blocking_task?.is_completed && "line-through text-muted-foreground"
              )}>
                {dep.blocking_task?.title || "Unknown task"}
              </span>
              <button onClick={() => handleRemove(dep.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <TaskSearchPopover
          projectId={projectId}
          excludeTaskId={taskId}
          label="Add blocker"
          onSelect={(id, title) => handleAddBlockedBy(id, title)}
        />
      </div>

      {/* Blocking */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
          <Link2 className="h-3 w-3" /> Blocking
        </p>
        <div className="space-y-1">
          {blocking.map((dep) => (
            <div key={dep.id} className="flex items-center gap-1.5 group">
              <span className={cn(
                "text-xs flex-1 truncate",
                dep.blocked_task?.is_completed && "line-through text-muted-foreground"
              )}>
                {dep.blocked_task?.title || "Unknown task"}
              </span>
              <button onClick={() => handleRemove(dep.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <TaskSearchPopover
          projectId={projectId}
          excludeTaskId={taskId}
          label="Add blocked task"
          onSelect={(id) => handleAddBlocking(id)}
        />
      </div>
    </div>
  );
}

function TaskSearchPopover({
  projectId,
  excludeTaskId,
  label,
  onSelect,
}: {
  projectId: string;
  excludeTaskId: string;
  label: string;
  onSelect: (taskId: string, title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ id: string; title: string; is_completed: boolean }[]>([]);

  useEffect(() => {
    if (!open || search.length < 2) { setResults([]); return; }
    const timer = setTimeout(() => {
      searchProjectTasks(projectId, search, excludeTaskId)
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, open, projectId, excludeTaskId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground px-1">
          <Plus className="mr-0.5 h-2.5 w-2.5" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="h-7 text-xs mb-2"
          autoFocus
        />
        <div className="max-h-[150px] overflow-y-auto space-y-0.5">
          {results.length === 0 && search.length >= 2 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">No tasks found</p>
          )}
          {results.map((task) => (
            <button
              key={task.id}
              onClick={() => {
                onSelect(task.id, task.title);
                setOpen(false);
                setSearch("");
              }}
              className="w-full text-left px-2 py-1 rounded hover:bg-muted text-xs truncate"
            >
              {task.title}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
