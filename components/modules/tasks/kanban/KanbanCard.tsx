"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, DollarSign, MessageSquare, Paperclip, UserCircle, Clock, CheckCircle2, Link2, Workflow } from "lucide-react";
import type { Task, Subtask } from "@/lib/types/tasks";
import { getAvatarColor, getInitials } from "@/lib/utils/avatar";
import { cn } from "@/lib/utils";
import { differenceInDays, startOfDay, isPast, isToday } from "date-fns";

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const priorityStyles: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  medium: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300",
};

// ─── Deadline status helpers ─────────────────────────────────────────────────

type DeadlineStatus = "overdue" | "due_soon" | "due_week" | "no_date" | "ok";

function getDeadlineStatus(dueDate: string | null): DeadlineStatus {
  if (!dueDate) return "no_date";
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(dueDate));
  if (isPast(due) && !isToday(due)) return "overdue";
  const daysUntil = differenceInDays(due, today);
  if (daysUntil <= 2) return "due_soon";
  if (daysUntil <= 7) return "due_week";
  return "ok";
}

const deadlineBorderStyles: Record<DeadlineStatus, string> = {
  overdue: "border-l-4 border-l-red-500",
  due_soon: "border-l-4 border-l-amber-500",
  due_week: "",
  no_date: "",
  ok: "",
};

// ─── Time-in-column helper ───────────────────────────────────────────────────

function getDaysInColumn(task: Task): number {
  // Use updated_at as a proxy for when the task last moved columns
  const entered = new Date(task.updated_at);
  return differenceInDays(new Date(), entered);
}

export function KanbanCard({
  task,
  onClick,
  overlay,
  subtasks,
  onToggleComplete,
}: {
  task: Task;
  onClick?: () => void;
  overlay?: boolean;
  subtasks?: Subtask[];
  onToggleComplete?: (taskId: string, completed: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const dri = task.assignees?.[0];
  const deadlineStatus = getDeadlineStatus(task.due_date);
  const daysInColumn = getDaysInColumn(task);
  const isCompleted = (task as Task & { is_completed?: boolean }).is_completed ?? false;

  // Subtask progress
  const totalSubtasks = subtasks?.length ?? 0;
  const completedSubtasks = subtasks?.filter((s) => s.completed).length ?? 0;
  const subtaskPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const subtaskColor =
    subtaskPercent > 75 ? "bg-emerald-500" : subtaskPercent >= 25 ? "bg-amber-500" : "bg-red-500";

  const cardContent = (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg border border-border/60 bg-card p-3 shadow-md transition-shadow hover:shadow-lg dark:shadow-black/40 dark:hover:shadow-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        !isCompleted && deadlineBorderStyles[deadlineStatus],
        isCompleted && "opacity-60"
      )}
    >
      {/* Top row: client + work stream + deadline badge */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.client_name && (
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">
              {task.client_name}
            </span>
          )}
          {task.work_stream_name && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70 truncate">
              <Workflow className="size-2.5 shrink-0" />
              {task.work_stream_name}
            </span>
          )}
          {!task.client_name && !task.work_stream_name && <span />}
        </div>

        {deadlineStatus === "overdue" && !isCompleted && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
            Overdue
          </Badge>
        )}
        {deadlineStatus === "due_soon" && !isCompleted && (
          <Badge className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-amber-500 text-white hover:bg-amber-600">
            Due Soon
          </Badge>
        )}
        {deadlineStatus === "due_week" && (
          <span className="h-2 w-2 rounded-full bg-yellow-400 shrink-0" />
        )}
      </div>

      <div className="flex items-start gap-1.5">
        {onToggleComplete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(task.id, !isCompleted);
            }}
            className={cn(
              "mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
              isCompleted
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-muted-foreground/40 hover:border-emerald-500"
            )}
            aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
          >
            {isCompleted && (
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}
        <p className={cn(
          "text-sm font-medium leading-snug line-clamp-2",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        {task.task_type === "paid" && (
          <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
        )}
      </div>

      {/* Subtask progress bar */}
      {totalSubtasks > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground font-medium">
            {completedSubtasks}/{totalSubtasks}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", subtaskColor)}
              style={{ width: `${subtaskPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {task.priority && task.priority !== "low" && (
          <Badge
            variant="secondary"
            className={`text-xs px-1.5 py-0 ${priorityStyles[task.priority] ?? ""}`}
          >
            {task.priority}
          </Badge>
        )}

        {task.due_date && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs",
              deadlineStatus === "overdue" && !isCompleted
                ? "text-red-600 dark:text-red-400 font-medium"
                : deadlineStatus === "due_soon" && !isCompleted
                  ? "text-amber-600 dark:text-amber-400 font-medium"
                  : "text-muted-foreground"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            {new Date(task.due_date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        )}

        {!task.due_date && (
          <span className="text-[10px] text-muted-foreground/60">No date</span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          {/* Time in column */}
          {daysInColumn > 0 && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[10px]",
                daysInColumn > 10
                  ? "text-red-500 font-semibold"
                  : daysInColumn > 5
                    ? "text-amber-500 font-medium"
                    : "text-muted-foreground"
              )}
            >
              <Clock className="h-3 w-3" />
              {daysInColumn}d
            </span>
          )}
          {(task.attachments_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-xs">
              <Paperclip className="h-3.5 w-3.5" />
              {task.attachments_count}
            </span>
          )}
          {(task.comments_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              {task.comments_count}
            </span>
          )}
          {(task.relations_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-xs">
              <Link2 className="h-3.5 w-3.5" />
              {task.relations_count}
            </span>
          )}
        </div>

        {dri ? (
          (() => {
            const name = dri.profiles?.full_name || "?";
            const color = getAvatarColor(name, dri.profiles?.avatar_color);
            return (
              <Avatar className="h-6 w-6">
                {dri.profiles?.avatar_url && (
                  <AvatarImage src={dri.profiles.avatar_url} alt={name} />
                )}
                <AvatarFallback className={cn("text-[9px] font-semibold", color.bg, color.text)}>
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
            );
          })()
        ) : (
          <UserCircle className="h-6 w-6 text-muted-foreground/40" />
        )}
      </div>
    </div>
  );

  if (overlay) return cardContent;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Created {timeAgo(task.created_at)}
      </TooltipContent>
    </Tooltip>
  );
}
