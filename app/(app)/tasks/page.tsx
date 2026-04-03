import { ListChecks } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { KanbanShell } from "@/components/modules/tasks/kanban/KanbanShell";
import { BoardQuote } from "@/components/modules/tasks/kanban/BoardQuote";
import { getClients, getProjects, getProfiles } from "@/app/(app)/tasks/actions";

export default async function TasksPage() {
  // Pre-fetch on the server so navigation is instant (Next.js caches the RSC payload)
  const [clients, projects, profiles] = await Promise.all([
    getClients().catch(() => []),
    getProjects().catch(() => []),
    getProfiles().catch(() => []),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 shrink-0">
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
      <Separator className="mb-4 shrink-0" />
      <div className="min-h-0 flex-1 overflow-hidden">
        <KanbanShell
          initialClients={clients ?? []}
          initialProjects={projects ?? []}
          initialProfiles={profiles ?? []}
        />
      </div>
      {/* Flush to main bottom; vertical rhythm matches AppSidebar bottom (Separator + NavLink + pb-3) */}
      <div className="-mx-6 -mb-6 shrink-0 border-t bg-card px-6 pb-3 pt-2">
        <div className="flex min-h-9 items-center justify-center">
          <BoardQuote />
        </div>
      </div>
    </div>
  );
}
