"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Clock,
  FileText,
  ShoppingCart,
  Receipt,
  FileCheck,
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
import type { ActivityItem } from "./actions";
import type { FinanceKPIs, ProjectFinancial } from "@/lib/types/finance";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#059669", "#E07A2F", "#6366f1", "#f43f5e", "#06b6d4", "#8b5cf6", "#eab308"];

function KPICard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
          <p className="text-lg font-bold leading-tight truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function FinanceOverviewClient({
  kpis,
  activity,
  expenseSummary,
  projectFinancials,
}: {
  kpis: FinanceKPIs;
  activity: ActivityItem[];
  expenseSummary: { total: number; byCategory: Record<string, number> } | null;
  projectFinancials: ProjectFinancial[];
}) {
  const expenseChartData = expenseSummary
    ? Object.entries(expenseSummary.byCategory).map(([name, value], i) => ({
        name: name.length > 16 ? name.slice(0, 15) + "…" : name,
        value,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }))
    : [];

  const activityIcon = (type: string) => {
    switch (type) {
      case "po": return <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />;
      case "expense": return <Receipt className="h-3.5 w-3.5 text-amber-500" />;
      case "invoice": return <FileCheck className="h-3.5 w-3.5 text-emerald-500" />;
      default: return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {(kpis.totalBudget ?? 0) > 0 && (
        <>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Estimated Pipeline</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard icon={TrendingUp} label="Total Project Value" value={formatINR(kpis.totalBudget ?? 0)}
              color="bg-primary/10 text-primary" />
            <KPICard icon={FileText} label="Active Projects" value={String(kpis.projectCount ?? 0)}
              color="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" />
            <KPICard icon={TrendingDown} label="Total Spent" value={formatINR(kpis.totalExpenses)}
              color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" />
            <KPICard icon={IndianRupee} label="Remaining Budget" value={formatINR((kpis.totalBudget ?? 0) - kpis.totalExpenses)}
              color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" />
          </div>
        </>
      )}

      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Actuals</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard icon={TrendingUp} label="Revenue (Paid)" value={formatINR(kpis.totalRevenue)}
          color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <KPICard icon={TrendingDown} label="Expenses" value={formatINR(kpis.totalExpenses)}
          color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" />
        <KPICard icon={IndianRupee} label="Net Profit" value={formatINR(kpis.netProfit)}
          color={kpis.netProfit >= 0
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"} />
        <KPICard icon={Clock} label="Outstanding Receivables" value={formatINR(kpis.outstandingReceivables)}
          color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
        <KPICard icon={FileText} label="Outstanding Payables" value={formatINR(kpis.outstandingPayables)}
          color="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expense Breakdown (This Month)</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {expenseChartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Receipt className="h-8 w-8 mb-2" />
                <p className="text-sm">No expenses recorded yet. Add your first one to see the breakdown.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={80} innerRadius={45} strokeWidth={2}>
                    {expenseChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <RechartsTooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [formatINR(Number(v)), ""]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Project Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {projectFinancials.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mb-2" />
                <p className="text-sm">No projects with budgets yet. Set a ₹ cost on task cards to start tracking.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectFinancials.slice(0, 8).map((p) => ({
                    name: p.project_title.length > 14 ? p.project_title.slice(0, 13) + "…" : p.project_title,
                    budget: p.budget,
                    spent: p.spent,
                  }))}
                  layout="vertical"
                  margin={{ left: 0, right: 10, top: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <RechartsTooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [formatINR(Number(v)), ""]} />
                  <Bar dataKey="budget" fill="#e5e7eb" radius={[0, 4, 4, 0]} name="Budget" />
                  <Bar dataKey="spent" radius={[0, 4, 4, 0]} name="Spent">
                    {projectFinancials.slice(0, 8).map((p, i) => (
                      <Cell key={i} fill={p.margin_percent > 20 ? "#059669" : p.margin_percent >= 0 ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Bar>
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No financial activity yet. Create a PO, log an expense, or send an invoice to get the ball rolling.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((item) => (
                <div key={`${item.type}-${item.id}`}
                  className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50 transition-colors">
                  {activityIcon(item.type)}
                  <span className="text-sm flex-1 truncate">{item.description}</span>
                  <span className="text-sm font-medium shrink-0">{formatINR(item.amount)}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(item.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
