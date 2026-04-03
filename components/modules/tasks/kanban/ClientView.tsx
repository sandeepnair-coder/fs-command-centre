"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Briefcase } from "lucide-react";
import type { ProjectColumn, Task, Subtask } from "@/lib/types/tasks";

export function ClientView({
  columns,
  onTaskClick,
}: {
  columns: ProjectColumn[];
  onTaskClick: (taskId: string) => void;
}) {
  const allTasks = useMemo(
    () => columns.flatMap((col) => (col.tasks || []).map((t) => ({ ...t, columnName: col.name }))),
    [columns]
  );

  const grouped = useMemo(() => {
    const map: Record<string, { name: string; tasks: (Task & { columnName: string })[] }> = {};
    allTasks.forEach((t) => {
      const key = t.client_name || "No Client";
      if (!map[key]) map[key] = { name: key, tasks: [] };
      map[key].tasks.push(t);
    });
    return Object.values(map).sort((a, b) => {
      if (a.name === "No Client") return 1;
      if (b.name === "No Client") return -1;
      return a.name.localeCompare(b.name);
    });
  }, [allTasks]);

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-4 pb-4">
        {grouped.map((group) => (
          <div key={group.name} className="rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b px-4 py-2.5">
              <Briefcase className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{group.name}</h3>
              <Badge variant="secondary" className="text-[10px] ml-auto">{group.tasks.length} tasks</Badge>
            </div>
            <div className="divide-y">
              {group.tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] h-4">{task.columnName}</Badge>
                      {task.priority && task.priority !== "low" && (
                        <span className="capitalize">{task.priority}</span>
                      )}
                      {task.due_date && (
                        <span className="tabular-nums">
                          {new Date(task.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                      {task.work_stream_name && (
                        <span className="truncate">{task.work_stream_name}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
            <Users className="mb-2 size-8" />
            <p className="text-sm">No tasks to group by client.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
