"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUpDown, Calendar, IndianRupee, CheckCircle2 } from "lucide-react";
import { differenceInDays, startOfDay, isPast, isToday } from "date-fns";
import type { Task, ProjectColumn, Subtask } from "@/lib/types/tasks";
import { getAvatarColor, getInitials } from "@/lib/utils/avatar";
import { cn } from "@/lib/utils";
import { EMPTY } from "@/lib/copy";

const priorityStyles: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  medium: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300",
};

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

type SortKey = "title" | "priority" | "due_date" | "cost" | "client_name" | "status";
type SortDir = "asc" | "desc";

function getDeadlineClass(dueDate: string | null) {
  if (!dueDate) return "";
  const due = startOfDay(new Date(dueDate));
  const today = startOfDay(new Date());
  if (isPast(due) && !isToday(due)) return "bg-red-50 dark:bg-red-950/20";
  const days = differenceInDays(due, today);
  if (days <= 2) return "bg-amber-50 dark:bg-amber-950/20";
  return "";
}

export function ListView({
  columns,
  onTaskClick,
  subtasksMap,
}: {
  columns: ProjectColumn[];
  onTaskClick: (taskId: string) => void;
  subtasksMap: Record<string, Subtask[]>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Build column name map
  const columnNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    columns.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [columns]);

  // Flatten tasks with column index for status sorting
  const allTasks = useMemo(() => {
    const tasks: (Task & { _colIdx: number })[] = [];
    columns.forEach((col, colIdx) => {
      (col.tasks || []).forEach((t) => {
        tasks.push({ ...t, _colIdx: colIdx });
      });
    });
    return tasks;
  }, [columns]);

  // Sort
  const sorted = useMemo(() => {
    const copy = [...allTasks];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "priority":
          cmp = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
          break;
        case "due_date": {
          const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          cmp = da - db;
          break;
        }
        case "cost":
          cmp = (a.cost ?? 0) - (b.cost ?? 0);
          break;
        case "client_name":
          cmp = (a.client_name ?? "").localeCompare(b.client_name ?? "");
          break;
        case "status":
          cmp = a._colIdx - b._colIdx;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [allTasks, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const SortableHead = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground"
      onClick={() => toggleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </TableHead>
  );

  return (
    <div className="rounded-lg border overflow-auto flex-1">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Title" sortKeyName="title" />
            <SortableHead label="Client" sortKeyName="client_name" />
            <SortableHead label="Priority" sortKeyName="priority" />
            <TableHead>Budget</TableHead>
            <SortableHead label="Due Date" sortKeyName="due_date" />
            <TableHead>Assignee</TableHead>
            <SortableHead label="Status" sortKeyName="status" />
            <TableHead>Subtasks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                {EMPTY.tasks.description}
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((task) => {
              const subs = subtasksMap[task.id] || [];
              const done = subs.filter((s) => s.completed).length;
              const dri = task.assignees?.[0];

              return (
                <TableRow
                  key={task.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    getDeadlineClass(task.due_date)
                  )}
                  onClick={() => onTaskClick(task.id)}
                >
                  <TableCell className="font-medium max-w-[250px] truncate">
                    {task.title}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {task.client_name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-xs px-1.5 py-0 ${priorityStyles[task.priority] ?? ""}`}
                    >
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.cost != null ? (
                      <span className="flex items-center gap-0.5 text-xs font-medium">
                        <IndianRupee className="h-3 w-3" />
                        {task.cost.toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.due_date ? (
                      <span className="flex items-center gap-1 text-xs">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.due_date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No date</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {dri ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          {dri.profiles?.avatar_url && (
                            <AvatarImage src={dri.profiles.avatar_url} />
                          )}
                          <AvatarFallback
                            className={cn(
                              "text-[8px] font-semibold",
                              getAvatarColor(dri.profiles?.full_name || "?", dri.profiles?.avatar_color).bg,
                              getAvatarColor(dri.profiles?.full_name || "?", dri.profiles?.avatar_color).text
                            )}
                          >
                            {getInitials(dri.profiles?.full_name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate max-w-[80px]">
                          {dri.profiles?.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {columnNameMap[task.column_id] || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {subs.length > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" />
                        {done}/{subs.length}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
