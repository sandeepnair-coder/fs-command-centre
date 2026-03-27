"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  X,
  ListTodo,
  AlertTriangle,
  Activity,
  CheckCircle,
  IndianRupee,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { differenceInDays, startOfDay, isPast, isToday } from "date-fns";
import type { ProjectColumn, Task } from "@/lib/types/tasks";

const STATUS_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c43",
  "#a855f7",
  "#06b6d4",
  "#f43f5e",
];
const PRIORITY_COLORS: Record<string, string> = {
  low: "#94a3b8",
  medium: "#38bdf8",
  high: "#f59e0b",
  urgent: "#ef4444",
};

export function AnalyticsPanel({
  columns,
  onClose,
}: {
  columns: ProjectColumn[];
  onClose: () => void;
}) {
  const allTasks = useMemo(
    () => columns.flatMap((c) => c.tasks || []),
    [columns]
  );

  // ─── Summary Stats ──────────────────────────────────────────────────────────

  const totalTasks = allTasks.length;

  const overdueTasks = useMemo(() => {
    const today = startOfDay(new Date());
    return allTasks.filter(
      (t) => t.due_date && isPast(startOfDay(new Date(t.due_date))) && !isToday(startOfDay(new Date(t.due_date)))
    ).length;
  }, [allTasks]);

  const inProgressTasks = useMemo(() => {
    const progressCols = columns.filter((c) =>
      c.name.toLowerCase().includes("progress")
    );
    return progressCols.reduce(
      (sum, c) => sum + (c.tasks?.length || 0),
      0
    );
  }, [columns]);

  const doneTasks = useMemo(() => {
    const doneCols = columns.filter(
      (c) =>
        c.name.toLowerCase().includes("done") ||
        c.name.toLowerCase().includes("approved")
    );
    return doneCols.reduce((sum, c) => sum + (c.tasks?.length || 0), 0);
  }, [columns]);

  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const totalBudget = useMemo(
    () => allTasks.reduce((sum, t) => sum + (t.cost ?? 0), 0),
    [allTasks]
  );

  // ─── Chart Data ─────────────────────────────────────────────────────────────

  const tasksByStatus = useMemo(
    () =>
      columns.map((col, i) => ({
        name: col.name.length > 15 ? col.name.slice(0, 14) + "…" : col.name,
        count: col.tasks?.length || 0,
        fill: STATUS_COLORS[i % STATUS_COLORS.length],
      })),
    [columns]
  );

  const tasksByPriority = useMemo(() => {
    const counts: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    allTasks.forEach((t) => {
      counts[t.priority] = (counts[t.priority] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: PRIORITY_COLORS[name] || "#94a3b8",
      }));
  }, [allTasks]);

  const budgetByStatus = useMemo(
    () =>
      columns
        .map((col, i) => ({
          name: col.name.length > 15 ? col.name.slice(0, 14) + "…" : col.name,
          budget: (col.tasks || []).reduce((sum, t) => sum + (t.cost ?? 0), 0),
          fill: STATUS_COLORS[i % STATUS_COLORS.length],
        }))
        .filter((d) => d.budget > 0),
    [columns]
  );

  // Deadline health
  const deadlineHealth = useMemo(() => {
    const today = startOfDay(new Date());
    let overdue = 0;
    let dueSoon = 0;
    let onTrack = 0;
    let noDate = 0;
    allTasks.forEach((t) => {
      if (!t.due_date) {
        noDate++;
      } else {
        const due = startOfDay(new Date(t.due_date));
        if (isPast(due) && !isToday(due)) overdue++;
        else if (differenceInDays(due, today) <= 2) dueSoon++;
        else onTrack++;
      }
    });
    return [
      { name: "Overdue", value: overdue, fill: "#ef4444" },
      { name: "Due Soon", value: dueSoon, fill: "#f59e0b" },
      { name: "On Track", value: onTrack, fill: "#22c55e" },
      { name: "No Date", value: noDate, fill: "#94a3b8" },
    ].filter((d) => d.value > 0);
  }, [allTasks]);

  // Avg time in column
  const avgTimeByColumn = useMemo(
    () =>
      columns.map((col) => {
        const tasks = col.tasks || [];
        if (tasks.length === 0) return { name: col.name.length > 12 ? col.name.slice(0, 11) + "…" : col.name, days: 0 };
        const totalDays = tasks.reduce((sum, t) => {
          return sum + differenceInDays(new Date(), new Date(t.updated_at));
        }, 0);
        return {
          name: col.name.length > 12 ? col.name.slice(0, 11) + "…" : col.name,
          days: Math.round(totalDays / tasks.length),
        };
      }),
    [columns]
  );

  // ─── Stat Card Component ────────────────────────────────────────────────────

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color?: string;
  }) => (
    <Card className="shadow-none">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color || "bg-muted"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-lg font-bold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="border rounded-xl bg-card/50 p-4 mb-3 space-y-4 animate-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Board Analytics</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={ListTodo} label="Total Tasks" value={totalTasks} color="bg-primary/10 text-primary" />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdueTasks} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
        <StatCard icon={Activity} label="In Progress" value={inProgressTasks} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={CheckCircle} label="Completion" value={`${completionRate}%`} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard icon={IndianRupee} label="Total Budget" value={`₹${totalBudget.toLocaleString("en-IN")}`} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tasks by Status */}
        <Card className="shadow-none">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent className="p-3 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasksByStatus} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <RechartsTooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {tasksByStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tasks by Priority */}
        <Card className="shadow-none">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tasks by Priority</CardTitle>
          </CardHeader>
          <CardContent className="p-3 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tasksByPriority}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={35}
                  strokeWidth={2}
                >
                  {tasksByPriority.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <RechartsTooltip contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget by Status */}
        {budgetByStatus.length > 0 && (
          <Card className="shadow-none">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Budget by Status (₹)</CardTitle>
            </CardHeader>
            <CardContent className="p-3 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetByStatus} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Budget"]} />
                  <Bar dataKey="budget" radius={[4, 4, 0, 0]}>
                    {budgetByStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Deadline Health */}
        <Card className="shadow-none">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Deadline Health</CardTitle>
          </CardHeader>
          <CardContent className="p-3 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deadlineHealth}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={35}
                  strokeWidth={2}
                >
                  {deadlineHealth.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <RechartsTooltip contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cycle Time */}
      <Card className="shadow-none">
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-xs font-medium text-muted-foreground">Average Time in Column (days)</CardTitle>
        </CardHeader>
        <CardContent className="p-3 h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={avgTimeByColumn} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <RechartsTooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [`${v} days`, "Avg Time"]} />
              <Bar dataKey="days" fill="#8884d8" radius={[4, 4, 0, 0]}>
                {avgTimeByColumn.map((_, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
