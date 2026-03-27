import { Suspense } from "react";
import { ListChecks } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanShell } from "@/components/modules/tasks/kanban/KanbanShell";
import { BoardQuote } from "@/components/modules/tasks/kanban/BoardQuote";

function KanbanSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-center gap-3 pb-2">
        <Skeleton className="h-9 w-[280px]" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="flex gap-4 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-72 space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <ListChecks className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">
            Task Management
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize work, track progress, get things done.
        </p>
      </div>
      <Separator className="mb-4" />
      <Suspense fallback={<KanbanSkeleton />}>
        <KanbanShell />
      </Suspense>
      <BoardQuote />
    </div>
  );
}
