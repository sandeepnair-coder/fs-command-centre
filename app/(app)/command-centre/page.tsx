import { connection } from "next/server";
import { LayoutDashboard } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CommandCentreShell } from "@/components/modules/command-centre/CommandCentreShell";
import {
  getSnapshotMetrics,
  getCriticalItems,
  getPotentialClients,
  getOpportunities,
  getRecentComms,
} from "./actions";

const EMPTY_METRICS = {
  totalClients: 0,
  activeTasks: 0,
  overdueTasks: 0,
  urgentTasks: 0,
  openConversations: 0,
  needsReply: 0,
  opportunities: 0,
  totalRevenue: 0,
};

export default async function CommandCentrePage() {
  await connection();

  const [metrics, criticalItems, potentialClients, opportunities, recentComms] = await Promise.all([
    getSnapshotMetrics().catch(() => EMPTY_METRICS),
    getCriticalItems().catch(() => []),
    getPotentialClients().catch(() => []),
    getOpportunities().catch(() => []),
    getRecentComms().catch(() => []),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-balance">Command Centre</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          The big picture. What needs attention, who&apos;s waiting, and where the opportunities are.
        </p>
      </div>
      <Separator className="mb-4 shrink-0" />
      <div className="min-h-0 flex-1 overflow-hidden">
        <CommandCentreShell
          metrics={metrics}
          criticalItems={criticalItems}
          potentialClients={potentialClients}
          opportunities={opportunities}
          recentComms={recentComms}
        />
      </div>
    </div>
  );
}
