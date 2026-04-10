import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Cable } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
const IntegrationsShell = dynamic(
  () => import("@/components/modules/settings/IntegrationsShell").then((m) => ({ default: m.IntegrationsShell })),
  { loading: () => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div> }
);

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Cable className="size-6" />
          <h1 className="text-2xl font-bold tracking-tight text-balance">Integrations</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Connect Gmail, Slack, and WhatsApp to sync conversations into Comms.
        </p>
      </div>
      <Separator className="mb-6" />
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        }
      >
        <IntegrationsShell />
      </Suspense>
    </div>
  );
}
