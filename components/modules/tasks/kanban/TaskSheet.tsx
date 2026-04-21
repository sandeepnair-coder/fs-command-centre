"use client";

import { useEffect, useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Paperclip,
  Link2,
  MessageSquare,
  Trash2,
  Upload,
  ExternalLink,
  Plus,
  X,
  Pencil,
  MoreHorizontal,
  Calendar,
  IndianRupee,
  User,
  UserCog,
  Flag,
  Columns3,
  Briefcase,
  Clock,
  Send,
  Workflow,
  GitBranch,
  ImageIcon,
} from "lucide-react";
import { getAvatarColor, getInitials as getAvatarInitials } from "@/lib/utils/avatar";
import { cn } from "@/lib/utils";
import { differenceInDays, startOfDay, isToday, format } from "date-fns";
import {
  getTaskDetail,
  updateTask,
  deleteTask,
  addAssignee,
  removeAssignee,
  addComment,
  deleteComment,
  uploadAttachment,
  deleteAttachment,
  uploadOutput,
  deleteOutput,
  addLink,
  deleteLink,
} from "@/app/(app)/tasks/actions";
import type {
  Task,
  ProjectColumn,
  TaskComment,
  TaskAttachment,
  TaskLink,
  TaskAssignee,
  TaskPriority,
  Profile,
  Subtask,
} from "@/lib/types/tasks";
import { SubtaskPanel } from "./SubtaskPanel";
import { TagPicker } from "./TagPicker";
import { DependencySection } from "./DependencyPicker";
import { toast } from "sonner";
import { DELETE, SUCCESS } from "@/lib/copy";

type TaskDetail = Task & {
  comments: TaskComment[];
  attachments: TaskAttachment[];
  links: TaskLink[];
  outputs?: TaskAttachment[];
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function dueDateContext(dateStr: string | null) {
  if (!dateStr) return { text: "No deadline yet — add one when this gets real", color: "text-muted-foreground/60 italic" };
  const due = startOfDay(new Date(dateStr));
  const today = startOfDay(new Date());
  if (isToday(due)) return { text: "Due today", color: "text-amber-600 font-medium" };
  const diff = differenceInDays(due, today);
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, color: "text-red-600 font-medium" };
  if (diff <= 7) return { text: `in ${diff}d`, color: "text-muted-foreground" };
  return { text: `in ${diff}d`, color: "text-muted-foreground" };
}

const priorityConfig: Record<string, { dot: string; label: string }> = {
  urgent: { dot: "bg-rose-500", label: "Urgent" },
  high: { dot: "bg-amber-500", label: "High" },
  medium: { dot: "bg-emerald-500", label: "Medium" },
  low: { dot: "bg-slate-400", label: "Low" },
};

type Client = { id: string; name: string };

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function TaskSheet({
  taskId,
  initialTask,
  columns,
  profiles,
  clients,
  onClose,
  onTaskUpdated,
  onTaskStatusChanged,
  onTaskDeleted,
  subtasksMap,
  onSubtasksChange,
}: {
  taskId: string | null;
  initialTask: Task | null;
  columns: ProjectColumn[];
  profiles: Profile[];
  clients: { id: string; name: string }[];
  onClose: () => void;
  onTaskUpdated: (task: Task) => void;
  onTaskStatusChanged: (taskId: string, newColumnId: string) => void;
  onTaskDeleted: (taskId: string) => void;
  subtasksMap?: Record<string, Subtask[]>;
  onSubtasksChange?: (taskId: string, subtasks: Subtask[]) => void;
}) {
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskTags, setTaskTags] = useState<import("@/lib/types/tasks").Tag[]>([]);

  // Instantly show the task from card data, then lazy-load extras
  useEffect(() => {
    if (taskId && initialTask) {
      // Immediately set detail with card data (empty extras)
      setDetail({
        ...initialTask,
        comments: detail?.id === taskId ? detail.comments : [],
        attachments: detail?.id === taskId ? detail.attachments : [],
        links: detail?.id === taskId ? detail.links : [],
      } as TaskDetail);

      // Fetch full detail in background
      setExtrasLoading(true);
      getTaskDetail(taskId)
        .then((data) => {
          setDetail(data as unknown as TaskDetail);
          setTaskTags(((data as Record<string, unknown>).tags as import("@/lib/types/tasks").Tag[]) || []);
        })
        .catch(() => {})
        .finally(() => setExtrasLoading(false));
    } else if (!taskId) {
      setDetail(null);
      setTaskTags([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  function handleFieldChange(updates: Partial<Task>) {
    if (!detail) return;
    const updated = { ...detail, ...updates };
    setDetail(updated as TaskDetail);
    onTaskUpdated(updated);
    if (updates.column_id && updates.column_id !== detail.column_id) {
      onTaskStatusChanged(detail.id, updates.column_id);
    }
  }

  function updateDetail(updater: (d: TaskDetail) => TaskDetail) {
    setDetail((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      queueMicrotask(() => onTaskUpdated(updated));
      return updated;
    });
  }

  async function handleDeleteTask() {
    if (!detail) return;
    setDeleting(true);
    try {
      await deleteTask(detail.id);
      setDeleteDialogOpen(false);
      onTaskDeleted(detail.id);
      onClose();
      toast.success(SUCCESS.taskDeleted);
    } catch {
      toast.error("Couldn't remove this task — try again?");
    } finally {
      setDeleting(false);
    }
  }

  const currentColumn = detail ? columns.find((c) => c.id === detail.column_id) : null;

  return (
    <Sheet
      open={!!taskId}
      modal={false}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent className="w-full sm:max-w-2xl lg:max-w-4xl p-0 flex flex-col overflow-hidden bg-muted">
        <SheetTitle className="sr-only">Task Details</SheetTitle>

        {/* ─── HEADER ─── */}
        {detail && (
          <SheetHeader className="border-b px-6 pt-8 pb-4 flex-shrink-0 space-y-0 bg-card">
            {/* Breadcrumb */}
            <Breadcrumb className="mb-2">
              <BreadcrumbList className="text-xs gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink className="cursor-pointer text-xs">Board</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs font-normal">{currentColumn?.name || "Unknown"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {/* Title */}
            <div className="flex items-start justify-between gap-3">
              <TitleEditor
                taskId={detail.id}
                title={detail.title}
                onChanged={(title) => handleFieldChange({ title })}
              />
              <div className="flex items-center gap-1 shrink-0 mt-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setTimeout(() => setDeleteDialogOpen(true), 0)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{DELETE.task.title}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {DELETE.task.description}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{DELETE.task.cancel}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteTask} disabled={deleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {deleting ? "Deleting..." : DELETE.task.confirm}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            {/* Meta line */}
            <p className="text-[11px] text-muted-foreground mt-1">
              Created {format(new Date(detail.created_at), "d MMM yyyy")} · Updated {timeAgo(detail.updated_at)}
            </p>
          </SheetHeader>
        )}

        {/* ─── BODY: TWO COLUMNS ─── */}
        {detail ? (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* ─── LEFT: MAIN CONTENT (scrollable) ─── */}
            <ScrollArea className="flex-1 min-w-0">
              <div className="p-4 space-y-3">
                {/* Description */}
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Description</p>
                  <DescriptionSection
                    taskId={detail.id}
                    description={detail.description}
                    onChanged={(description) => handleFieldChange({ description })}
                  />
                </div>

                {/* Subtasks */}
                <div className="rounded-xl border bg-card p-4">
                  <SubtaskPanel
                    taskId={detail.id}
                    subtasks={subtasksMap?.[detail.id] || []}
                    onUpdate={(subs) => onSubtasksChange?.(detail.id, subs)}
                  />
                </div>

                {/* Attachments */}
                <div className="rounded-xl border bg-card p-4 relative">
                  {extrasLoading && detail.attachments.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/50 rounded-xl z-10">
                      <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    </div>
                  )}
                  <AttachmentsSection
                    taskId={detail.id}
                    attachments={detail.attachments}
                    onAdded={(att) =>
                      updateDetail((d) => ({
                        ...d,
                        attachments: [...d.attachments, att],
                        attachments_count: (d.attachments_count || 0) + 1,
                      }))
                    }
                    onRemoved={(attId) =>
                      updateDetail((d) => ({
                        ...d,
                        attachments: d.attachments.filter((a) => a.id !== attId),
                        attachments_count: Math.max(0, (d.attachments_count || 0) - 1),
                      }))
                    }
                  />
                </div>

                {/* Final Outputs */}
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-card p-4 relative">
                  {extrasLoading && detail.links.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/50 rounded-xl z-10">
                      <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    </div>
                  )}
                  <FinalOutputsSection
                    taskId={detail.id}
                    links={detail.links}
                    outputs={detail.outputs || []}
                    onLinkAdded={(link) =>
                      updateDetail((d) => ({
                        ...d,
                        links: [...d.links, link],
                        links_count: (d.links_count || 0) + 1,
                      }))
                    }
                    onLinkRemoved={(linkId) =>
                      updateDetail((d) => ({
                        ...d,
                        links: d.links.filter((l) => l.id !== linkId),
                        links_count: Math.max(0, (d.links_count || 0) - 1),
                      }))
                    }
                    onOutputAdded={(out) =>
                      updateDetail((d) => ({
                        ...d,
                        outputs: [...(d.outputs || []), out],
                      }))
                    }
                    onOutputRemoved={(outId) =>
                      updateDetail((d) => ({
                        ...d,
                        outputs: (d.outputs || []).filter((o) => o.id !== outId),
                      }))
                    }
                  />
                </div>

                {/* Comments */}
                <div className="rounded-xl border bg-card p-4 relative">
                  {extrasLoading && detail.comments.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/50 rounded-xl z-10">
                      <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    </div>
                  )}
                  <CommentsSection
                    taskId={detail.id}
                    comments={detail.comments}
                    profiles={profiles}
                    onAdded={(comment) =>
                      updateDetail((d) => ({
                        ...d,
                        comments: [...d.comments, comment],
                        comments_count: (d.comments_count || 0) + 1,
                      }))
                    }
                    onRemoved={(commentId) =>
                      updateDetail((d) => ({
                        ...d,
                        comments: d.comments.filter((c) => c.id !== commentId),
                        comments_count: Math.max(0, (d.comments_count || 0) - 1),
                      }))
                    }
                  />
                </div>
              </div>
            </ScrollArea>

            {/* ─── RIGHT: SIDEBAR (sticky) ─── */}
            <ScrollArea className="w-[300px] lg:w-[320px] shrink-0 border-l">
              <div className="p-3 space-y-3">
                {/* Group 1: Assignee, Manager, Status, Priority */}
                <div className="rounded-xl border bg-card p-1">
                <SidebarField icon={User} label="Assignee">
                  <AssigneeField task={detail} profiles={profiles} onChanged={handleFieldChange} />
                </SidebarField>

                <SidebarField icon={UserCog} label="Manager">
                  <ManagerField task={detail} profiles={profiles} onChanged={handleFieldChange} />
                </SidebarField>

                <SidebarField icon={Columns3} label="Status">
                  <Select value={detail.column_id} onValueChange={async (v) => {
                    handleFieldChange({ column_id: v });
                    try { await updateTask(detail.id, { column_id: v }); } catch { toast.error("Status didn't stick — try again."); }
                  }}>
                    <SelectTrigger className="h-8 text-sm bg-muted/50 border-border/50">
                      <SelectValue>
                        <Badge variant="outline" className="text-xs">
                          {currentColumn?.name || "Unknown"}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {columns.map((col) => <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SidebarField>

                <SidebarField icon={Flag} label="Priority">
                  <Select value={detail.priority || "low"} onValueChange={async (v) => {
                    handleFieldChange({ priority: v as TaskPriority });
                    try { await updateTask(detail.id, { priority: v as TaskPriority }); } catch { toast.error("Priority didn't save — try again."); }
                  }}>
                    <SelectTrigger className="h-8 text-sm bg-muted/50 border-border/50">
                      <SelectValue>
                        <Badge variant="secondary" className={cn("text-xs gap-1.5",
                          detail.priority === "urgent" && "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
                          detail.priority === "high" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                          detail.priority === "medium" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                          detail.priority === "low" && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                        )}>
                          <span className={cn("h-2 w-2 rounded-full", priorityConfig[detail.priority]?.dot || "bg-slate-400")} />
                          {priorityConfig[detail.priority]?.label || "Low"}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {Object.entries(priorityConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full", v.dot)} />
                            {v.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SidebarField>
                </div>

                {/* Group 2: Due Date, Cost */}
                <div className="rounded-xl border bg-card p-1">
                <SidebarField icon={Calendar} label="Due Date">
                  <Input
                    type="date"
                    value={detail.due_date ?? ""}
                    onChange={async (e) => {
                      const val = e.target.value || null;
                      handleFieldChange({ due_date: val });
                      try { await updateTask(detail.id, { due_date: val }); } catch { toast.error("Date didn't save — try again."); }
                    }}
                    className="h-8 text-sm bg-muted/50 border-border/50"
                  />
                  {detail.due_date && (
                    <p className={cn("text-[10px] mt-0.5", dueDateContext(detail.due_date).color)}>
                      {dueDateContext(detail.due_date).text}
                    </p>
                  )}
                  {!detail.due_date && (
                    <p className="text-[10px] text-muted-foreground/50 italic">No deadline yet — add one when this gets real</p>
                  )}
                </SidebarField>

                <SidebarField icon={IndianRupee} label="Cost (₹)">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={detail.cost ?? ""}
                    onChange={async (e) => {
                      const num = e.target.value ? parseFloat(e.target.value) : null;
                      handleFieldChange({ cost: num });
                    }}
                    onBlur={async (e) => {
                      const num = e.target.value ? parseFloat(e.target.value) : null;
                      try { await updateTask(detail.id, { cost: num }); } catch { toast.error("Cost didn't save — try again."); }
                    }}
                    className="h-8 text-sm bg-muted/50 border-border/50"
                  />
                </SidebarField>
                </div>

                {/* Group 3: Client, Tags */}
                <div className="rounded-xl border bg-card p-1">
                <SidebarField icon={Briefcase} label="Client">
                  <ClientField task={detail} clients={clients} onChanged={handleFieldChange} />
                </SidebarField>

                <div className="py-2.5 px-3">
                  <p className="text-[11px] font-medium text-foreground/60 mb-1.5 flex items-center gap-1.5">
                    Tags
                  </p>
                  <TagPicker taskId={detail.id} tags={taskTags} onTagsChange={setTaskTags} />
                </div>

                <div className="py-2.5 px-3">
                  <p className="text-[11px] font-medium text-foreground/60 mb-1.5 flex items-center gap-1.5">
                    <IndianRupee className="size-3.5" /> Task Type
                  </p>
                  <TaskTypeField task={detail} onChanged={handleFieldChange} />
                </div>
                </div>

                {/* Meta (read-only) */}
                <div className="rounded-xl border bg-card p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-foreground/50">
                    <Clock className="h-3.5 w-3.5" />
                    Created {format(new Date(detail.created_at), "d MMM yyyy")}
                  </div>
                  <div className="text-[11px] text-foreground/50 pl-[19px] mt-0.5">
                    Updated {timeAgo(detail.updated_at)}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR FIELD ROW
// ═══════════════════════════════════════════════════════════════════════════════

function SidebarField({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <p className="text-[11px] font-medium text-foreground/60 mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGNEE FIELD
// ═══════════════════════════════════════════════════════════════════════════════

function AssigneeField({
  task,
  profiles,
  onChanged,
}: {
  task: Task;
  profiles: Profile[];
  onChanged: (updates: Partial<Task>) => void;
}) {
  const assignedIds = new Set((task.assignees || []).map((a) => a.user_id));
  const available = profiles.filter((p) => !assignedIds.has(p.id));

  async function handleAdd(profile: Profile) {
    const newAssignee: TaskAssignee = {
      task_id: task.id,
      user_id: profile.id,
      profiles: { full_name: profile.full_name, avatar_url: profile.avatar_url, avatar_color: profile.avatar_color },
    };
    onChanged({ assignees: [...(task.assignees || []), newAssignee] });
    try { await addAssignee(task.id, profile.id); } catch { toast.error("Couldn't add them — try again."); }
  }

  async function handleRemove(userId: string) {
    onChanged({ assignees: (task.assignees || []).filter((a) => a.user_id !== userId) });
    try { await removeAssignee(task.id, userId); } catch { toast.error("Couldn't remove them — try again."); }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(task.assignees || []).map((a) => {
        const name = a.profiles?.full_name || "?";
        const color = getAvatarColor(name, a.profiles?.avatar_color);
        return (
          <div key={a.user_id} className="flex items-center gap-1.5 rounded-full bg-background border px-2 py-0.5 text-xs">
            <Avatar className="h-4 w-4">
              {a.profiles?.avatar_url && <AvatarImage src={a.profiles.avatar_url} />}
              <AvatarFallback className={cn("text-[7px] font-semibold", color.bg, color.text)}>
                {getAvatarInitials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[70px] truncate">{name}</span>
            <button onClick={() => handleRemove(a.user_id)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      {available.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground">
              <Plus className="h-3 w-3 mr-1" />
              {(task.assignees || []).length === 0 ? "Add someone" : "Add"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {available.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => handleAdd(p)}>
                <Avatar className="h-5 w-5 mr-2">
                  <AvatarFallback className={cn("text-[8px]", getAvatarColor(p.full_name).bg, getAvatarColor(p.full_name).text)}>
                    {getAvatarInitials(p.full_name || "?")}
                  </AvatarFallback>
                </Avatar>
                {p.full_name || "Unnamed"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANAGER FIELD (single-select)
// ═══════════════════════════════════════════════════════════════════════════════

function ManagerField({
  task,
  profiles,
  onChanged,
}: {
  task: Task;
  profiles: Profile[];
  onChanged: (updates: Partial<Task>) => void;
}) {
  const currentManager = task.manager_id
    ? profiles.find((p) => p.id === task.manager_id)
    : null;

  async function handleSelect(profile: Profile) {
    onChanged({ manager_id: profile.id, manager_name: profile.full_name });
    try {
      await updateTask(task.id, { manager_id: profile.id });
    } catch {
      toast.error("Manager didn't save — try again.");
    }
  }

  async function handleRemove() {
    onChanged({ manager_id: null, manager_name: null });
    try {
      await updateTask(task.id, { manager_id: null });
    } catch {
      toast.error("Couldn't remove manager — try again.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {currentManager ? (
        <div className="flex items-center gap-1.5 rounded-full bg-background border px-2 py-0.5 text-xs">
          <Avatar className="h-4 w-4">
            {currentManager.avatar_url && <AvatarImage src={currentManager.avatar_url} />}
            <AvatarFallback className={cn("text-[7px] font-semibold", getAvatarColor(currentManager.full_name, currentManager.avatar_color).bg, getAvatarColor(currentManager.full_name, currentManager.avatar_color).text)}>
              {getAvatarInitials(currentManager.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[70px] truncate">{currentManager.full_name}</span>
          <button onClick={handleRemove} className="text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground">
              <Plus className="h-3 w-3 mr-1" />
              Assign manager
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {profiles.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => handleSelect(p)}>
                <Avatar className="h-5 w-5 mr-2">
                  <AvatarFallback className={cn("text-[8px]", getAvatarColor(p.full_name).bg, getAvatarColor(p.full_name).text)}>
                    {getAvatarInitials(p.full_name || "?")}
                  </AvatarFallback>
                </Avatar>
                {p.full_name || "Unnamed"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {currentManager && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground">
              Change
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {profiles.filter((p) => p.id !== task.manager_id).map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => handleSelect(p)}>
                <Avatar className="h-5 w-5 mr-2">
                  <AvatarFallback className={cn("text-[8px]", getAvatarColor(p.full_name).bg, getAvatarColor(p.full_name).text)}>
                    {getAvatarInitials(p.full_name || "?")}
                  </AvatarFallback>
                </Avatar>
                {p.full_name || "Unnamed"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT FIELD
// ═══════════════════════════════════════════════════════════════════════════════

function ClientField({
  task,
  clients,
  onChanged,
}: {
  task: Task;
  clients: Client[];
  onChanged: (updates: Partial<Task>) => void;
}) {
  const currentClientId = task.client_id || "";

  return (
    <Select
      value={currentClientId}
      onValueChange={async (v) => {
        const client = clients.find((c) => c.id === v);
        if (client) {
          onChanged({ client_id: client.id, client_name: client.name });
          try { await updateTask(task.id, { client_id: client.id }); } catch { toast.error("Client didn't save — try again."); }
        }
      }}
    >
      <SelectTrigger className="h-8 text-sm bg-muted/50 border-border/50">
        <SelectValue placeholder="Select client" />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        {clients.map((c) => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        ))}
        {clients.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No clients yet. <a href="/clients" className="text-primary underline">Create one</a>
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TITLE EDITOR
// ═══════════════════════════════════════════════════════════════════════════════

function TitleEditor({ taskId, title, onChanged }: { taskId: string; title: string; onChanged: (t: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(title); }, [title]);

  async function save() {
    setEditing(false);
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) { setValue(title); return; }
    onChanged(trimmed);
    try { await updateTask(taskId, { title: trimmed }); } catch { toast.error("Title didn't save — try again."); }
  }

  if (editing) {
    return (
      <Input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)}
        onBlur={save} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setValue(title); setEditing(false); } }}
        className="text-xl font-bold border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 h-auto" autoFocus />
    );
  }

  return (
    <h2 className="text-xl font-bold cursor-pointer hover:text-primary group flex items-center gap-2 flex-1"
      onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}>
      {title}
      <Pencil className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
    </h2>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESCRIPTION
// ═══════════════════════════════════════════════════════════════════════════════

function DescriptionSection({ taskId, description, onChanged }: { taskId: string; description: string | null; onChanged: (d: string | null) => void }) {
  const [value, setValue] = useState(description ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setValue(description ?? ""); }, [description]);

  function handleChange(newValue: string) {
    setValue(newValue);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      const trimmed = newValue.trim() || null;
      onChanged(trimmed);
      try { await updateTask(taskId, { description: trimmed }); } catch { toast.error("Description didn't save — try again."); }
    }, 800);
  }

  return (
    <Textarea value={value} onChange={(e) => handleChange(e.target.value)}
      placeholder="What does this task need? Context, references, wild ideas — anything that helps."
      rows={4} className="text-sm border-0 bg-transparent px-0 shadow-none resize-none focus-visible:ring-0" />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATTACHMENTS
// ═══════════════════════════════════════════════════════════════════════════════

function AttachmentsSection({ taskId, attachments, onAdded, onRemoved }: {
  taskId: string; attachments: TaskAttachment[]; onAdded: (a: TaskAttachment) => void; onRemoved: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData(); fd.set("file", file);
        const att = await uploadAttachment(taskId, fd);
        onAdded(att);
      }
    } catch { toast.error("Upload didn't work — try again."); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-3 w-3" /> Attachments {attachments.length > 0 && `(${attachments.length})`}
        </p>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload className="mr-1 h-3 w-3" /> {uploading ? "Uploading..." : "Attach"}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      </div>
      {attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {attachments.map((att) => (
            <div key={att.id} className="group relative rounded-md border overflow-hidden">
              {att.url ? <img src={att.url} alt={att.file_name} className="h-20 w-full object-cover" /> :
                <div className="flex h-20 items-center justify-center bg-muted text-xs text-muted-foreground">{att.file_name}</div>}
              <button onClick={async () => { try { await deleteAttachment(att.id); onRemoved(att.id); } catch { toast.error("Couldn't remove that file — try again."); } }}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
              <p className="truncate px-1 py-0.5 text-[10px] text-muted-foreground">{att.file_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUTS
// ═══════════════════════════════════════════════════════════════════════════════

function FinalOutputsSection({ taskId, links, outputs, onLinkAdded, onLinkRemoved, onOutputAdded, onOutputRemoved }: {
  taskId: string; links: TaskLink[]; outputs: TaskAttachment[];
  onLinkAdded: (l: TaskLink) => void; onLinkRemoved: (id: string) => void;
  onOutputAdded: (o: TaskAttachment) => void; onOutputRemoved: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData(); fd.set("file", file);
        const out = await uploadOutput(taskId, fd);
        onOutputAdded(out);
      }
    } catch { toast.error("Upload didn't work — try again."); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function handleAddLink() {
    if (!url.trim()) return;
    try { const l = await addLink(taskId, url.trim(), label.trim()); onLinkAdded(l); setUrl(""); setLabel(""); setAdding(false); }
    catch { toast.error("Link didn't save — try again."); }
  }

  const totalCount = links.length + outputs.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
          <ExternalLink className="h-3 w-3" /> Final Outputs {totalCount > 0 && `(${totalCount})`}
        </p>
        <div className="flex gap-1">
          {!adding && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAdding(true)}><Plus className="mr-1 h-3 w-3" /> Add link</Button>}
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="mr-1 h-3 w-3" /> {uploading ? "Uploading..." : "Upload"}
          </Button>
          <input ref={fileRef} type="file" accept="image/*,.pdf,.ai,.psd,.fig,.sketch,.svg" multiple className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {adding && (
        <div className="space-y-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL..." className="h-8 text-sm" autoFocus />
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className="h-8 text-sm" />
          <div className="flex gap-2">
            <Button size="sm" className="h-7" onClick={handleAddLink}>Add</Button>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => { setAdding(false); setUrl(""); setLabel(""); }}>Cancel</Button>
          </div>
        </div>
      )}

      {links.map((link) => (
        <div key={link.id} className="flex items-start gap-2 py-1.5 group">
          <ExternalLink className="h-3 w-3 shrink-0 mt-1 text-emerald-600" />
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 text-sm text-primary hover:underline break-all">
            {link.label || link.url}
          </a>
          <button onClick={async () => { try { await deleteLink(link.id); onLinkRemoved(link.id); } catch { toast.error("Couldn't remove that link — try again."); } }}
            className="text-muted-foreground/40 hover:text-destructive shrink-0 mt-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ))}

      {outputs.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {outputs.map((out) => (
            <div key={out.id} className="group relative rounded-md border border-emerald-200 dark:border-emerald-900/50 overflow-hidden">
              {out.url ? <img src={out.url} alt={out.file_name} className="h-20 w-full object-cover" /> :
                <div className="flex h-20 items-center justify-center bg-emerald-50 dark:bg-emerald-950/20 text-xs text-muted-foreground">{out.file_name}</div>}
              <button onClick={async () => { try { await deleteOutput(out.id); onOutputRemoved(out.id); } catch { toast.error("Couldn't remove that output — try again."); } }}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
              <p className="truncate px-1 py-0.5 text-[10px] text-muted-foreground">{out.file_name}</p>
            </div>
          ))}
        </div>
      )}

      {totalCount === 0 && !adding && (
        <p className="text-xs text-muted-foreground/50 italic">No final outputs yet. Add a link or upload a file.</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENTS
// ═══════════════════════════════════════════════════════════════════════════════

function CommentsSection({ taskId, comments, profiles, onAdded, onRemoved }: {
  taskId: string; comments: TaskComment[]; profiles: Profile[]; onAdded: (c: TaskComment) => void; onRemoved: (id: string) => void;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mentionResults = mentionQuery !== null
    ? profiles.filter((p) => p.full_name?.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : [];

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setBody(val);
    const pos = e.target.selectionStart;
    const textBefore = val.slice(0, pos);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }

  function insertMention(name: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const textBefore = body.slice(0, pos);
    const atPos = textBefore.lastIndexOf("@");
    if (atPos === -1) return;
    const before = body.slice(0, atPos);
    const after = body.slice(pos);
    const newBody = `${before}@${name} ${after}`;
    setBody(newBody);
    setMentionQuery(null);
    setTimeout(() => {
      const newPos = atPos + name.length + 2;
      ta.focus();
      ta.setSelectionRange(newPos, newPos);
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { handleSubmit(); return; }
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, mentionResults.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(mentionResults[mentionIndex].full_name); return; }
      if (e.key === "Escape") { setMentionQuery(null); return; }
    }
  }

  async function handleSubmit() {
    if (!body.trim()) return;
    setSubmitting(true);
    try { const c = await addComment(taskId, body.trim()); onAdded(c); setBody(""); setMentionQuery(null); }
    catch { toast.error("Comment didn't post — try again."); } finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <MessageSquare className="h-3 w-3" /> Comments {comments.length > 0 && `(${comments.length})`}
      </p>

      {/* Comment input */}
      <div className="relative">
        <Textarea ref={textareaRef} value={body} onChange={handleChange}
          placeholder="Say something — even a quick 'Let's do this' counts. (⌘+Enter to send)" rows={2} className="text-sm pr-12 bg-muted/50 border-muted-foreground/20 focus:border-primary/50 placeholder:text-muted-foreground/50"
          onKeyDown={handleKeyDown} />
        {/* Mention dropdown */}
        {mentionQuery !== null && mentionResults.length > 0 && (
          <div className="absolute left-0 bottom-full mb-1 w-full rounded-md border bg-popover shadow-md z-50 py-1">
            {mentionResults.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-accent",
                  i === mentionIndex && "bg-accent"
                )}
                onMouseDown={(e) => { e.preventDefault(); insertMention(p.full_name); }}
              >
                <Avatar className="h-5 w-5">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                  <AvatarFallback className={cn("text-[8px]", getAvatarColor(p.full_name).bg, getAvatarColor(p.full_name).text)}>
                    {getAvatarInitials(p.full_name || "?")}
                  </AvatarFallback>
                </Avatar>
                <span>{p.full_name}</span>
              </button>
            ))}
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="absolute right-2 bottom-2 h-7 w-7 text-primary hover:text-primary"
              onClick={handleSubmit} disabled={submitting || !body.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Send (⌘+Enter)</TooltipContent>
        </Tooltip>
      </div>

      {/* Comments list */}
      {comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                {c.profiles?.avatar_url && <AvatarImage src={c.profiles.avatar_url} />}
                <AvatarFallback className={cn("text-[9px] font-semibold", getAvatarColor(c.profiles?.full_name || "").bg, getAvatarColor(c.profiles?.full_name || "").text)}>
                  {getAvatarInitials(c.profiles?.full_name || "?")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{c.profiles?.full_name || "User"}</span>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                  <button onClick={async () => { try { await deleteComment(c.id); onRemoved(c.id); } catch { toast.error("Couldn't remove that — try again."); } }}
                    className="ml-auto text-muted-foreground/30 hover:text-destructive transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {c.body.split(/(@\w[\w\s]*?)(?=\s|$)/g).map((part, i) =>
                    part.startsWith("@") ? (
                      <span key={i} className="text-primary font-medium">{part}</span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
