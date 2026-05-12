"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Columns3, MoreVertical, Trash2, BarChart3, Pencil } from "lucide-react";
import {
  getClients,
  getProjects,
  getColumns,
  getProfiles,
  deleteProject,
  seedDefaultColumns,
} from "@/app/(app)/tasks/actions";
import dynamic from "next/dynamic";
import { KanbanBoard } from "./KanbanBoard";
import { FilterBar } from "./FilterBar";
const ListView = dynamic(() => import("./ListView").then((m) => ({ default: m.ListView })), { ssr: false });
const CalendarView = dynamic(() => import("./CalendarView").then((m) => ({ default: m.CalendarView })), { ssr: false });
const ClientView = dynamic(() => import("./ClientView").then((m) => ({ default: m.ClientView })), { ssr: false });
const StreamView = dynamic(() => import("./StreamView").then((m) => ({ default: m.StreamView })), { ssr: false });
const AnalyticsPanel = dynamic(() => import("./AnalyticsPanel").then((m) => ({ default: m.AnalyticsPanel })), { ssr: false });
import { NewBoardDialog } from "../new-project-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectColumn, Profile, TaskFilters, ViewMode, Subtask } from "@/lib/types/tasks";
import { DEFAULT_FILTERS, filterColumns } from "@/lib/tasks/filters";
import { toast } from "sonner";
import { DELETE, EMPTY, SUCCESS } from "@/lib/copy";
import type { Task } from "@/lib/types/tasks";
import { AddTaskDialog } from "./dialogs/AddTaskDialog";
import { AddColumnPopover } from "./dialogs/AddColumnPopover";
import { RenameBoardDialog } from "./dialogs/RenameBoardDialog";
import { TaskSheetWrapper } from "./TaskSheetWrapper";

type Client = { id: string; name: string };
type Project = {
  id: string;
  name: string;
  status: string;
  client_id: string | null;
  clients: { name: string } | null;
};

export function KanbanShell({
  initialClients = [],
  initialProjects = [],
  initialProfiles = [],
  initialFilterParams,
}: {
  initialClients?: Client[];
  initialProjects?: Project[];
  initialProfiles?: Profile[];
  initialFilterParams?: Record<string, string | undefined>;
} = {}) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [columns, setColumns] = useState<ProjectColumn[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialClients.length === 0 && initialProjects.length === 0);
  const [boardLoading, setBoardLoading] = useState(false);

  // Board delete
  const [deleting, setDeleting] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  // Add Task dialog state
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  // ─── New feature state ──────────────────────────────────────────────────
  const [filters, setFilters] = useState<TaskFilters>(() => {
    if (!initialFilterParams) return DEFAULT_FILTERS;
    const f = { ...DEFAULT_FILTERS };
    if (initialFilterParams.dueDate === "overdue" || initialFilterParams.dueDate === "this_week" || initialFilterParams.dueDate === "this_month" || initialFilterParams.dueDate === "no_date") f.dueDate = initialFilterParams.dueDate;
    if (initialFilterParams.priority === "low" || initialFilterParams.priority === "medium" || initialFilterParams.priority === "high" || initialFilterParams.priority === "urgent") f.priority = initialFilterParams.priority;
    if (initialFilterParams.assignee && initialFilterParams.assignee !== "all") f.assignee = initialFilterParams.assignee;
    if (initialFilterParams.manager && initialFilterParams.manager !== "all") f.manager = initialFilterParams.manager;
    if (initialFilterParams.client && initialFilterParams.client !== "all") f.client = initialFilterParams.client;
    if (initialFilterParams.search) f.search = initialFilterParams.search;
    return f;
  });
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Subtask[]>>({});

  // ─── Load clients, projects & profiles ────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, pr] = await Promise.all([
        getClients(),
        getProjects(),
        getProfiles(),
      ]);
      setClients(c ?? []);
      setProjects(p ?? []);
      setProfiles(pr ?? []);
    } catch {
      // Tables may not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore saved board; skip data fetch if server already provided it
  useEffect(() => {
    const saved = localStorage.getItem("fs_kanban_board");
    if (saved) setSelectedProjectId(saved);
    if (initialClients.length === 0 && initialProjects.length === 0) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist selected board
  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem("fs_kanban_board", selectedProjectId);
    } else {
      localStorage.removeItem("fs_kanban_board");
    }
  }, [selectedProjectId]);

  // ─── Load board when project changes ──────────────────────────────────

  const loadBoard = useCallback(async (projectId: string) => {
    setBoardLoading(true);
    try {
      await seedDefaultColumns(projectId);
      const data = await getColumns(projectId);
      setColumns(data);

      // Build subtasksMap from DB data (subtasks are now on each task)
      const sMap: Record<string, Subtask[]> = {};
      data.forEach((col: ProjectColumn) => {
        (col.tasks || []).forEach((t) => {
          if (t.subtasks && t.subtasks.length > 0) sMap[t.id] = t.subtasks;
        });
      });
      setSubtasksMap(sMap);
    } catch {
      setColumns([]);
    } finally {
      setBoardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadBoard(selectedProjectId);
    } else {
      setColumns([]);
      setSubtasksMap({});
    }
  }, [selectedProjectId, loadBoard]);

  // ─── Subtask handler ──────────────────────────────────────────────────

  const handleSubtasksChange = useCallback((taskId: string, subtasks: Subtask[]) => {
    setSubtasksMap((prev) => ({ ...prev, [taskId]: subtasks }));
  }, []);

  // ─── Filtered columns for views ──────────────────────────────────────

  const filteredColumns = useMemo(
    () => filterColumns(columns, filters),
    [columns, filters]
  );

  // ─── Handlers ─────────────────────────────────────────────────────────

  async function handleDeleteBoard() {
    if (!selectedProjectId) return;
    setDeleting(true);
    try {
      await deleteProject(selectedProjectId);
      setSelectedProjectId(null);
      setColumns([]);
      setProjects((prev) => prev.filter((p) => p.id !== selectedProjectId));
      toast.success(SUCCESS.boardDeleted);
    } catch {
      toast.error("Couldn't delete the board. Try again?");
    } finally {
      setDeleting(false);
    }
  }

  function handleRefresh() {
    loadData();
    if (selectedProjectId) loadBoard(selectedProjectId);
  }

  // ─── Add Task optimistic callback ─────────────────────────────────────

  function handleTaskCreated(task: Task, columnId: string, tempId: string) {
    if (!task) {
      // Remove the optimistic card (failure or validation error)
      setColumns((prev) =>
        prev.map((c) =>
          c.id === columnId
            ? { ...c, tasks: (c.tasks || []).filter((t) => t.id !== tempId) }
            : c
        )
      );
      return;
    }

    if (task.id === tempId) {
      // Optimistic: add the temp card
      setColumns((prev) =>
        prev.map((c) =>
          c.id === columnId
            ? { ...c, tasks: [...(c.tasks || []), task] }
            : c
        )
      );
    } else {
      // Replace temp card with real one
      setColumns((prev) =>
        prev.map((c) =>
          c.id === columnId
            ? { ...c, tasks: (c.tasks || []).map((t) => t.id === tempId ? task : t) }
            : c
        )
      );
    }
  }

  // ─── Task click handler for non-kanban views ──────────────────────────

  const [selectedTaskIdForSheet, setSelectedTaskIdForSheet] = useState<string | null>(null);

  // ─── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        {/* Toolbar skeleton */}
        <div className="flex items-center gap-3 pb-2">
          <Skeleton className="h-9 w-[280px]" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        {/* Columns skeleton */}
        <div className="flex gap-4 flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-72 space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              {i < 3 && <Skeleton className="h-28 w-full rounded-lg" />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const selectedBoard = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      {/* ─── Top Bar ─── */}
      <div className="flex flex-wrap items-center gap-3 pb-3 shrink-0">
        {/* Left: board selector + options */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedProjectId ?? "__none__"}
            onValueChange={(v) =>
              setSelectedProjectId(v === "__none__" ? null : v)
            }
          >
            <SelectTrigger className="w-[280px] h-9">
              <SelectValue placeholder="Select a board" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" disabled>
                Select a board
              </SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Board options menu */}
          {selectedProjectId && (
            <>
            <AlertDialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => {
                    setRenameOpen(true);
                  }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename Board
                  </DropdownMenuItem>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Board
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{DELETE.board.title}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {DELETE.board.description}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{DELETE.board.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteBoard}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting..." : DELETE.board.confirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Rename Board Dialog */}
            <RenameBoardDialog
              open={renameOpen}
              onOpenChange={setRenameOpen}
              projectId={selectedProjectId}
              currentName={selectedBoard?.name || ""}
              onRenamed={(newName) => {
                setProjects((prev) =>
                  prev.map((p) => (p.id === selectedProjectId ? { ...p, name: newName } : p))
                );
              }}
            />
            </>
          )}

        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Analytics toggle */}
          {selectedProjectId && (
            <Button
              variant={showAnalytics ? "default" : "outline"}
              size="sm"
              className="h-9"
              onClick={() => setShowAnalytics((p) => !p)}
            >
              <BarChart3 className="mr-1 h-4 w-4" />
              Analytics
            </Button>
          )}
          <NewBoardDialog onCreated={handleRefresh} />
          {selectedProjectId && (
            <>
              {/* ─── Add Task Dialog ─── */}
              <AddTaskDialog
                open={addTaskOpen}
                onOpenChange={setAddTaskOpen}
                columns={columns}
                clients={clients}
                profiles={profiles}
                projectId={selectedProjectId}
                onTaskCreated={handleTaskCreated}
                onClientsRefreshed={setClients}
                onProfilesRefreshed={setProfiles}
              />

              {/* ─── Add Column Popover ─── */}
              <AddColumnPopover
                projectId={selectedProjectId}
                onColumnCreated={(col) => setColumns((prev) => [...prev, col])}
              />
            </>
          )}
        </div>
      </div>

      {/* ─── Board ─── */}
      {!selectedProjectId ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground">
          <Columns3 className="mb-2 h-8 w-8" />
          <p>{EMPTY.board.description}</p>
        </div>
      ) : boardLoading ? (
        <div className="flex gap-4 flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-72 space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              {i < 3 && <Skeleton className="h-28 w-full rounded-lg" />}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Filter Bar */}
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            profiles={profiles}
            clients={clients}
            columns={columns}
          />

          {/* Analytics Panel */}
          {showAnalytics && (
            <AnalyticsPanel
              columns={filteredColumns}
              onClose={() => setShowAnalytics(false)}
            />
          )}

          {/* View Renderer */}
          {viewMode === "kanban" && (
            <KanbanBoard
              projectId={selectedProjectId}
              clientId={selectedBoard?.client_id || null}
              columns={filteredColumns}
              setColumns={setColumns}
              subtasksMap={subtasksMap}
              onSubtasksChange={handleSubtasksChange}
              profiles={profiles}
              clients={clients}
            />
          )}

          {viewMode === "list" && (
            <ListView
              columns={filteredColumns}
              onTaskClick={setSelectedTaskIdForSheet}
              subtasksMap={subtasksMap}
            />
          )}

          {viewMode === "calendar" && (
            <CalendarView
              columns={filteredColumns}
              onTaskClick={setSelectedTaskIdForSheet}
            />
          )}

          {viewMode === "client" && (
            <ClientView
              columns={filteredColumns}
              onTaskClick={setSelectedTaskIdForSheet}
            />
          )}

          {viewMode === "stream" && (
            <StreamView
              columns={filteredColumns}
              onTaskClick={setSelectedTaskIdForSheet}
            />
          )}

          {/* TaskSheet for non-kanban views */}
          {viewMode !== "kanban" && (
            <TaskSheetWrapper
              taskId={selectedTaskIdForSheet}
              columns={columns}
              profiles={profiles}
              clients={clients}
              onClose={() => setSelectedTaskIdForSheet(null)}
              setColumns={setColumns}
              subtasksMap={subtasksMap}
              onSubtasksChange={handleSubtasksChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
