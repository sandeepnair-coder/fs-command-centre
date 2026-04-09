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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Plus, Columns3, MoreVertical, Trash2, BarChart3, Pencil } from "lucide-react";
import {
  getClients,
  getProjects,
  getColumns,
  getProfiles,
  createColumn,
  createTask,
  addAssignee,
  deleteProject,
  renameProject,
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
const TaskSheet = dynamic(() => import("./TaskSheet").then((m) => ({ default: m.TaskSheet })), { ssr: false });
import { NewBoardDialog } from "../new-project-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectColumn, TaskPriority, Profile, TaskFilters, ViewMode, Subtask } from "@/lib/types/tasks";
import { DEFAULT_FILTERS, filterColumns } from "@/lib/tasks/filters";
import { toast } from "sonner";
import { DELETE, EMPTY, SUCCESS } from "@/lib/copy";
import type { Task } from "@/lib/types/tasks";

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
}: {
  initialClients?: Client[];
  initialProjects?: Project[];
  initialProfiles?: Profile[];
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
  const [renameName, setRenameName] = useState("");

  // Add Column popover state
  const [addColOpen, setAddColOpen] = useState(false);
  const [addColName, setAddColName] = useState("");

  // Add Task dialog state
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskColumnId, setNewTaskColumnId] = useState<string>("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("low");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState<string>("__none__");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskClientId, setNewTaskClientId] = useState<string>("__none__");
  const [newTaskCreating, setNewTaskCreating] = useState(false);

  // ─── New feature state ──────────────────────────────────────────────────
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
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

  // ─── Reset Add Task dialog defaults when dialog opens ─────────────────

  async function openAddTaskDialog() {
    setNewTaskTitle("");
    setNewTaskColumnId(columns.length > 0 ? columns[0].id : "");
    setNewTaskPriority("low");
    setNewTaskAssigneeId("__none__");
    setNewTaskDueDate("");
    setNewTaskClientId("__none__");
    setAddTaskOpen(true);
    // Refresh clients so newly added ones appear in the dropdown
    try {
      const freshClients = await getClients();
      if (freshClients) setClients(freshClients);
    } catch {}
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  async function handleRenameBoard() {
    if (!selectedProjectId || !renameName.trim()) return;
    const trimmed = renameName.trim();
    try {
      await renameProject(selectedProjectId, trimmed);
      setProjects((prev) =>
        prev.map((p) => (p.id === selectedProjectId ? { ...p, name: trimmed } : p))
      );
      setRenameOpen(false);
      toast.success(SUCCESS.boardRenamed);
    } catch {
      toast.error("Couldn't rename the board. Try again?");
    }
  }

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

  async function handleAddColumn() {
    if (!selectedProjectId) return;
    const trimmed = addColName.trim();
    if (!trimmed) return;
    setAddColName("");
    setAddColOpen(false);
    try {
      const col = await createColumn(selectedProjectId, trimmed);
      setColumns((prev) => [...prev, { ...col, tasks: [] }]);
    } catch {
      toast.error("Column didn't save. Try again?");
    }
  }

  async function handleAddTask() {
    if (!selectedProjectId || !newTaskColumnId) return;
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;

    setNewTaskCreating(true);

    // Optimistic: show the card instantly
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = {
      id: tempId,
      project_id: selectedProjectId,
      column_id: newTaskColumnId,
      title: trimmed,
      priority: newTaskPriority,
      due_date: newTaskDueDate || null,
      client_id: newTaskClientId !== "__none__" ? newTaskClientId : null,
      position: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Task;
    setColumns((prev) =>
      prev.map((c) =>
        c.id === newTaskColumnId
          ? { ...c, tasks: [...(c.tasks || []), optimisticTask] }
          : c
      )
    );
    setAddTaskOpen(false);
    toast.success(SUCCESS.taskCreated);

    try {
      const resolvedClientId = newTaskClientId !== "__none__" ? newTaskClientId : null;
      if (!resolvedClientId) {
        toast.error("Client is required. Select a client or create one in the Clients section first.");
        setNewTaskCreating(false);
        // Remove optimistic card
        setColumns((prev) =>
          prev.map((c) =>
            c.id === newTaskColumnId
              ? { ...c, tasks: (c.tasks || []).filter((t) => t.id !== tempId) }
              : c
          )
        );
        return;
      }

      const task = await createTask(selectedProjectId, newTaskColumnId, trimmed, {
        priority: newTaskPriority,
        due_date: newTaskDueDate || null,
        client_id: resolvedClientId,
      });

      // Add assignee if selected
      if (newTaskAssigneeId !== "__none__") {
        await addAssignee(task.id, newTaskAssigneeId);
        const assigneeProfile = profiles.find((p) => p.id === newTaskAssigneeId);
        if (assigneeProfile) {
          task.assignees = [
            {
              task_id: task.id,
              user_id: assigneeProfile.id,
              profiles: {
                full_name: assigneeProfile.full_name,
                avatar_url: assigneeProfile.avatar_url,
              },
            },
          ];
        }
      }

      // Replace temp card with real one
      setColumns((prev) =>
        prev.map((c) =>
          c.id === newTaskColumnId
            ? { ...c, tasks: (c.tasks || []).map((t) => t.id === tempId ? task : t) }
            : c
        )
      );
    } catch {
      // Remove the optimistic card on failure
      setColumns((prev) =>
        prev.map((c) =>
          c.id === newTaskColumnId
            ? { ...c, tasks: (c.tasks || []).filter((t) => t.id !== tempId) }
            : c
        )
      );
      toast.error("That task didn't save. Give it another shot.");
    } finally {
      setNewTaskCreating(false);
    }
  }

  function handleRefresh() {
    loadData();
    if (selectedProjectId) loadBoard(selectedProjectId);
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
                    setRenameName(selectedBoard?.name || "");
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
            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Rename Board</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                  <Input
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    placeholder="Board name"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameBoard();
                    }}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost" size="sm">Cancel</Button>
                  </DialogClose>
                  <Button size="sm" onClick={handleRenameBoard} disabled={!renameName.trim()}>
                    Rename
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
              <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-9"
                    onClick={openAddTaskDialog}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>New Task</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    {/* Title */}
                    <div className="space-y-1.5">
                      <Label htmlFor="task-title" className="text-sm">
                        Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="task-title"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="What needs doing?"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !newTaskCreating) handleAddTask();
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Status / Column */}
                      <div className="space-y-1.5">
                        <Label className="text-sm">Status</Label>
                        <Select
                          value={newTaskColumnId}
                          onValueChange={setNewTaskColumnId}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {columns.map((col) => (
                              <SelectItem key={col.id} value={col.id}>
                                {col.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Priority */}
                      <div className="space-y-1.5">
                        <Label className="text-sm">Priority</Label>
                        <Select
                          value={newTaskPriority}
                          onValueChange={(v) =>
                            setNewTaskPriority(v as TaskPriority)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Client (required) */}
                      <div className="space-y-1.5">
                        <Label className="text-sm">Client <span className="text-destructive">*</span></Label>
                        {clients.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">
                            No clients yet.{" "}
                            <a href="/clients" className="text-primary underline">Create a client first</a>
                          </p>
                        ) : (
                          <Select
                            value={newTaskClientId}
                            onValueChange={setNewTaskClientId}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" disabled>Select client</SelectItem>
                              {clients.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Assignee */}
                      <div className="space-y-1.5">
                        <Label className="text-sm">Assignee</Label>
                        <Select
                          value={newTaskAssigneeId}
                          onValueChange={setNewTaskAssigneeId}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Unassigned</SelectItem>
                            {profiles.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.full_name || "Unnamed"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Due Date */}
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-sm">Due Date</Label>
                        <Input
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost" size="sm">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      size="sm"
                      onClick={handleAddTask}
                      disabled={newTaskCreating || !newTaskTitle.trim() || newTaskClientId === "__none__"}
                    >
                      {newTaskCreating ? "Creating..." : "Create Task"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* ─── Add Column Popover ─── */}
              <Popover open={addColOpen} onOpenChange={setAddColOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Columns3 className="mr-1 h-4 w-4" />
                    Add Column
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">New Column</p>
                    <Input
                      value={addColName}
                      onChange={(e) => setAddColName(e.target.value)}
                      placeholder="e.g., In Progress"
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddColumn();
                        if (e.key === "Escape") {
                          setAddColOpen(false);
                          setAddColName("");
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7" onClick={handleAddColumn}>
                        Add
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => {
                          setAddColOpen(false);
                          setAddColName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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

function TaskSheetWrapper({
  taskId,
  columns,
  profiles,
  clients,
  onClose,
  setColumns,
  subtasksMap,
  onSubtasksChange,
}: {
  taskId: string | null;
  columns: ProjectColumn[];

  profiles: { id: string; full_name: string; avatar_url: string | null; avatar_color: string | null }[];
  clients: { id: string; name: string }[];
  onClose: () => void;
  setColumns: React.Dispatch<React.SetStateAction<ProjectColumn[]>>;
  subtasksMap: Record<string, Subtask[]>;
  onSubtasksChange: (taskId: string, subtasks: Subtask[]) => void;
}) {
  // Find the task from columns for instant rendering
  const initialTask = taskId
    ? columns.flatMap((c) => c.tasks || []).find((t) => t.id === taskId) ?? null
    : null;

  function handleTaskUpdated(updatedTask: Task) {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: (col.tasks || []).map((t) =>
          t.id === updatedTask.id ? { ...t, ...updatedTask } : t
        ),
      }))
    );
  }

  function handleTaskDeleted(deletedId: string) {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: (col.tasks || []).filter((t) => t.id !== deletedId),
      }))
    );
    onClose();
  }

  function handleTaskStatusChanged(movedTaskId: string, newColumnId: string) {
    let movedTask: Task | null = null;
    setColumns((prev) => {
      const updated = prev.map((col) => ({
        ...col,
        tasks: (col.tasks || []).filter((t) => {
          if (t.id === movedTaskId) {
            movedTask = { ...t, column_id: newColumnId };
            return false;
          }
          return true;
        }),
      }));
      if (movedTask) {
        return updated.map((col) =>
          col.id === newColumnId
            ? { ...col, tasks: [...(col.tasks || []), movedTask!] }
            : col
        );
      }
      return updated;
    });
  }

  return (
    <TaskSheet
      taskId={taskId}
      initialTask={initialTask}
      columns={columns}
      profiles={profiles}
      clients={clients}
      onClose={onClose}
      onTaskUpdated={handleTaskUpdated}
      onTaskStatusChanged={handleTaskStatusChanged}
      onTaskDeleted={handleTaskDeleted}
      subtasksMap={subtasksMap}
      onSubtasksChange={onSubtasksChange}
    />
  );
}
