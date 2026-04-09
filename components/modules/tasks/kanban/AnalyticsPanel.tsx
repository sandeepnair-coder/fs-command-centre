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
  Users,
  Building2,
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
import type { ProjectColumn } from "@/lib/types/tasks";

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

  // ─── Member Workload ───────────────────────────────────────────────────────

  const memberWorkload = useMemo(() => {
    const map: Record<string, { name: string; total: number; done: number; overdue: number; avatar_url: string | null }> = {};
    const doneColIds = new Set(
      columns
        .filter((c) => c.name.toLowerCase().includes("done") || c.name.toLowerCase().includes("approved"))
        .map((c) => c.id)
    );
    const today = startOfDay(new Date());

    allTasks.forEach((t) => {
      (t.assignees || []).forEach((a) => {
        const name = a.profiles?.full_name || "Unknown";
        if (!map[a.user_id]) {
          map[a.user_id] = { name, total: 0, done: 0, overdue: 0, avatar_url: a.profiles?.avatar_url || null };
        }
        map[a.user_id].total++;
        if (doneColIds.has(t.column_id)) map[a.user_id].done++;
        if (t.due_date && isPast(startOfDay(new Date(t.due_date))) && !isToday(startOfDay(new Date(t.due_date))) && !doneColIds.has(t.column_id)) {
          map[a.user_id].overdue++;
        }
      });
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [allTasks, columns]);

  const memberChartData = useMemo(
    () => memberWorkload.map((m) => ({
      name: m.name.length > 14 ? m.name.slice(0, 13) + "…" : m.name,
      Active: m.total - m.done,
      Done: m.done,
    })),
    [memberWorkload]
  );

  // Unassigned tasks
  const unassignedTasks = useMemo(
    () => allTasks.filter((t) => !t.assignees || t.assignees.length === 0).length,
    [allTasks]
  );

  // ─── Tasks by Client ──────────────────────────────────────────────────────

  const clientDistribution = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    allTasks.forEach((t) => {
      const name = t.client_name || "No Client";
      const key = t.client_id || "__none__";
      if (!map[key]) map[key] = { name, count: 0 };
      map[key].count++;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .map((d, i) => ({ ...d, fill: STATUS_COLORS[i % STATUS_COLORS.length] }));
  }, [allTasks]);

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
    <div className="border rounded-xl bg-card/50 p-4 mb-3 space-y-4 animate-in slide-in-from-top-2 duration-300 overflow-y-auto max-h-[calc(100vh-220px)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Board Analytics</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={ListTodo} label="Total Tasks" value={totalTasks} color="bg-primary/10 text-primary" />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdueTasks} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
        <StatCard icon={Activity} label="In Progress" value={inProgressTasks} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={CheckCircle} label="Completion" value={`${completionRate}%`} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard icon={IndianRupee} label="Total Budget" value={`₹${totalBudget.toLocaleString("en-IN")}`} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <StatCard icon={Users} label="Unassigned" value={unassignedTasks} color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
        <StatCard icon={Building2} label="Clients" value={clientDistribution.length} color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
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

      {/* ─── Team & Client Section ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Member Workload */}
        {memberChartData.length > 0 && (
          <Card className="shadow-none">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Workload by Member</CardTitle>
            </CardHeader>
            <CardContent className="p-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberChartData} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <RechartsTooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Active" stackId="a" fill="#38bdf8" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Done" stackId="a" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Tasks by Client */}
        {clientDistribution.length > 0 && (
          <Card className="shadow-none">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Tasks by Client</CardTitle>
            </CardHeader>
            <CardContent className="p-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientDistribution} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <RechartsTooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {clientDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Member Detail Table ─────────────────────────────────────────────── */}
      {memberWorkload.length > 0 && (
        <Card className="shadow-none">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Team Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] text-muted-foreground uppercase tracking-wider">
                    <th className="pb-2 font-medium">Member</th>
                    <th className="pb-2 font-medium text-right tabular-nums">Total</th>
                    <th className="pb-2 font-medium text-right tabular-nums">Done</th>
                    <th className="pb-2 font-medium text-right tabular-nums">Active</th>
                    <th className="pb-2 font-medium text-right tabular-nums">Overdue</th>
                    <th className="pb-2 font-medium text-right tabular-nums">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {memberWorkload.map((m) => (
                    <tr key={m.name} className="border-b last:border-0">
                      <td className="py-2 flex items-center gap-2">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="size-5 rounded-full object-cover" />
                        ) : (
                          <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                            {m.name.charAt(0)}
                          </div>
                        )}
                        <span className="truncate max-w-[140px]">{m.name}</span>
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium">{m.total}</td>
                      <td className="py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{m.done}</td>
                      <td className="py-2 text-right tabular-nums text-blue-600 dark:text-blue-400">{m.total - m.done}</td>
                      <td className="py-2 text-right tabular-nums">
                        {m.overdue > 0 ? (
                          <span className="text-red-600 dark:text-red-400">{m.overdue}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {m.total > 0 ? `${Math.round((m.done / m.total) * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
