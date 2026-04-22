import { connection } from "next/server";
import { LayoutDashboard } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CommandCentreShell } from "@/components/modules/command-centre/CommandCentreShell";
import { getDashboardData, getSnapshotMetrics } from "./actions";
import type { DashboardData, SnapshotMetrics } from "./actions";

const EMPTY_METRICS: SnapshotMetrics = {
  totalClients: 0,
  activeTasks: 0,
  overdueTasks: 0,
  urgentTasks: 0,
  openConversations: 0,
  needsReply: 0,
  opportunities: 0,
  totalRevenue: 0,
};

const EMPTY_DASHBOARD: DashboardData = {
  deliveryHealth: { total: 0, completed: 0, inProgress: 0, pending: 0, overdue: 0, inReview: 0, urgent: 0, healthStatus: "good", completionRate: 0 },
  teamWorkload: [],
  clientRisk: [],
  bottlenecks: [],
  criticalItems: [],
};

export default async function CommandCentrePage() {
  await connection();

  const [dashboardData, metrics] = await Promise.all([
    getDashboardData().catch(() => EMPTY_DASHBOARD),
    getSnapshotMetrics().catch(() => EMPTY_METRICS),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Command Centre</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Delivery health, team workload, and client risk — at a glance.
        </p>
      </div>
      <Separator className="mb-4 shrink-0" />
      <div className="min-h-0 flex-1 overflow-hidden">
        <CommandCentreShell
          dashboardData={dashboardData}
          metrics={metrics}
        />
      </div>
    </div>
  );
}
