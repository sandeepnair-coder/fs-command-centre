"use client";

import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, CalendarX } from "lucide-react";
import type { Task, ProjectColumn } from "@/lib/types/tasks";
import { cn } from "@/lib/utils";

const priorityDotColor: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-sky-500",
  high: "bg-amber-500",
  urgent: "bg-rose-500",
};

export function CalendarView({
  columns,
  onTaskClick,
}: {
  columns: ProjectColumn[];
  onTaskClick: (taskId: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // All tasks flattened
  const allTasks = useMemo(
    () => columns.flatMap((c) => c.tasks || []),
    [columns]
  );

  // Tasks grouped by date string
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    allTasks.forEach((t) => {
      if (t.due_date) {
        const key = format(new Date(t.due_date), "yyyy-MM-dd");
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [allTasks]);

  // Unscheduled tasks
  const unscheduled = useMemo(
    () => allTasks.filter((t) => !t.due_date),
    [allTasks]
  );

  // Calendar grid days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // Tasks for selected date
  const selectedTasks = selectedDate
    ? tasksByDate[format(selectedDate, "yyyy-MM-dd")] || []
    : [];

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-medium text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px flex-1 auto-rows-fr">
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDate[dateKey] || [];
            const inMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "relative p-1 rounded-md text-left border border-transparent transition-colors min-h-[60px]",
                  inMonth ? "bg-card" : "bg-muted/30",
                  isSelected && "ring-2 ring-primary border-primary",
                  isToday(day) && "bg-primary/5",
                  "hover:border-border"
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    !inMonth && "text-muted-foreground/40",
                    isToday(day) && "text-primary font-bold"
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Task dots / counts */}
                {dayTasks.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {dayTasks.length <= 4 ? (
                      dayTasks.map((t) => (
                        <span
                          key={t.id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            priorityDotColor[t.priority] || "bg-slate-400"
                          )}
                        />
                      ))
                    ) : (
                      <span className="text-[9px] font-medium text-muted-foreground">
                        {dayTasks.length} tasks
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar: Selected day tasks + Unscheduled */}
      <div className="w-[240px] flex-shrink-0 flex flex-col gap-3 min-h-0">
        {/* Selected date tasks */}
        <div className="flex-1 min-h-0 flex flex-col">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">
            {selectedDate ? format(selectedDate, "EEEE, d MMM") : "Select a date"}
          </h4>
          <ScrollArea className="flex-1">
            <div className="space-y-1.5 pr-2">
              {selectedDate && selectedTasks.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No tasks due this day.
                </p>
              )}
              {selectedTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  className="w-full text-left p-2 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                >
                  <p className="text-xs font-medium line-clamp-2">{task.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge
                      variant="secondary"
                      className={cn("text-[9px] px-1 py-0", {
                        "bg-amber-100 text-amber-700": task.priority === "high",
                        "bg-rose-100 text-rose-700": task.priority === "urgent",
                        "bg-sky-100 text-sky-700": task.priority === "medium",
                      })}
                    >
                      {task.priority}
                    </Badge>
                    {task.client_name && (
                      <span className="text-[9px] text-muted-foreground truncate">
                        {task.client_name}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Unscheduled */}
        {unscheduled.length > 0 && (
          <div className="border-t pt-2 max-h-[200px] min-h-0 flex flex-col">
            <h4 className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <CalendarX className="h-3 w-3" />
              Unscheduled ({unscheduled.length})
            </h4>
            <ScrollArea className="flex-1">
              <div className="space-y-1 pr-2">
                {unscheduled.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task.id)}
                    className="w-full text-left p-1.5 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-[11px] font-medium line-clamp-1">{task.title}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
