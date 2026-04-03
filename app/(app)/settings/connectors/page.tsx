import { Suspense } from "react";
import { Settings, Plug2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectorsShell } from "@/components/modules/settings/ConnectorsShell";

export default function ConnectorsPage() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Plug2 className="size-6" />
          <h1 className="text-2xl font-bold tracking-tight text-balance">Connectors</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Manage integrations and agent access. Control what Open Claw and future connectors can see and do.
        </p>
      </div>
      <Separator className="mb-6" />
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-64 rounded-xl" />
          </div>
        }
      >
        <ConnectorsShell />
      </Suspense>
    </div>
  );
}
