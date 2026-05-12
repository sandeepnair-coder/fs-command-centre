"use client";

import { useState } from "react";
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
import { Plus } from "lucide-react";
import {
  getClients,
  getProfiles,
  createTask,
  addAssignee,
} from "@/app/(app)/tasks/actions";
import { toast } from "sonner";
import { SUCCESS } from "@/lib/copy";
import type { ProjectColumn, TaskPriority, Profile, Task } from "@/lib/types/tasks";

type Client = { id: string; name: string };

export function AddTaskDialog({
  open,
  onOpenChange,
  columns,
  clients,
  profiles,
  onTaskCreated,
  onClientsRefreshed,
  onProfilesRefreshed,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ProjectColumn[];
  clients: Client[];
  profiles: Profile[];
  onTaskCreated: (task: Task, columnId: string, tempId: string) => void;
  onClientsRefreshed: (clients: Client[]) => void;
  onProfilesRefreshed: (profiles: Profile[]) => void;
  projectId: string;
}) {
  const [title, setTitle] = useState("");
  const [columnId, setColumnId] = useState<string>("");
  const [priority, setPriority] = useState<TaskPriority>("low");
  const [assigneeId, setAssigneeId] = useState<string>("__none__");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState<string>("__none__");
  const [managerId, setManagerId] = useState<string>("__none__");
  const [creating, setCreating] = useState(false);

  async function handleOpen() {
    setTitle("");
    setColumnId(columns.length > 0 ? columns[0].id : "");
    setPriority("low");
    setAssigneeId("__none__");
    setDueDate("");
    setClientId("__none__");
    setManagerId("__none__");
    onOpenChange(true);
    // Refresh clients and profiles so newly added ones appear in dropdowns
    try {
      const [freshClients, freshProfiles] = await Promise.all([
        getClients(),
        getProfiles(),
      ]);
      if (freshClients) onClientsRefreshed(freshClients);
      if (freshProfiles) onProfilesRefreshed(freshProfiles);
    } catch {}
  }

  async function handleAddTask() {
    if (!projectId || !columnId) return;
    const trimmed = title.trim();
    if (!trimmed) return;

    setCreating(true);

    // Optimistic: show the card instantly
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = {
      id: tempId,
      project_id: projectId,
      column_id: columnId,
      title: trimmed,
      priority,
      due_date: dueDate || null,
      client_id: clientId !== "__none__" ? clientId : null,
      position: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Task;
    onTaskCreated(optimisticTask, columnId, tempId);
    onOpenChange(false);
    toast.success(SUCCESS.taskCreated);

    try {
      const resolvedClientId = clientId !== "__none__" ? clientId : null;
      if (!resolvedClientId) {
        toast.error("Client is required. Select a client or create one in the Clients section first.");
        setCreating(false);
        // Signal removal of optimistic card by passing null task with tempId
        onTaskCreated(null as unknown as Task, columnId, tempId);
        return;
      }

      const resolvedManagerId = managerId !== "__none__" ? managerId : null;
      const task = await createTask(projectId, columnId, trimmed, {
        priority,
        due_date: dueDate || null,
        client_id: resolvedClientId,
        manager_id: resolvedManagerId,
      });

      // Add assignee if selected
      if (assigneeId !== "__none__") {
        await addAssignee(task.id, assigneeId);
        const assigneeProfile = profiles.find((p) => p.id === assigneeId);
        if (assigneeProfile) {
          task.assignees = [
            {
              task_id: task.id,
              user_id: assigneeProfile.id,
              profiles: {
                full_name: assigneeProfile.full_name,
                avatar_url: assigneeProfile.avatar_url,
                avatar_color: assigneeProfile.avatar_color,
              },
            },
          ];
        }
      }

      // Replace temp card with real one
      onTaskCreated(task, columnId, tempId);
    } catch {
      // Remove the optimistic card on failure
      onTaskCreated(null as unknown as Task, columnId, tempId);
      toast.error("That task didn't save. Give it another shot.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-9"
          onClick={handleOpen}
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creating) handleAddTask();
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Status / Column */}
            <div className="space-y-1.5">
              <Label className="text-sm">Status</Label>
              <Select
                value={columnId}
                onValueChange={setColumnId}
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
                value={priority}
                onValueChange={(v) =>
                  setPriority(v as TaskPriority)
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
                  value={clientId}
                  onValueChange={setClientId}
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
                value={assigneeId}
                onValueChange={setAssigneeId}
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

            {/* Manager */}
            <div className="space-y-1.5">
              <Label className="text-sm">Manager <span className="text-destructive">*</span></Label>
              <Select
                value={managerId}
                onValueChange={setManagerId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>Select manager</SelectItem>
                  {profiles.filter((p) => p.is_manager).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name || "Unnamed"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label className="text-sm">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
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
            disabled={creating || !title.trim() || clientId === "__none__" || managerId === "__none__"}
          >
            {creating ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
