"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  linkTaskToConversation,
  getProjectColumns,
} from "@/app/(app)/comms/actions";
import { getProjects, createTask } from "@/app/(app)/tasks/actions";

export function CreateTaskDialog({
  open,
  onOpenChange,
  conversationId,
  clientId,
  messageId,
  messagePreview,
  onTaskCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  clientId: string | null;
  messageId?: string;
  messagePreview?: string;
  onTaskCreated?: () => void;
}) {
  const [title, setTitle] = useState(messagePreview?.slice(0, 80) || "");
  const [projectId, setProjectId] = useState("");
  const [columnId, setColumnId] = useState("");
  const [loading, setLoading] = useState(false);
  const [projectsList, setProjectsList] = useState<{ id: string; name: string; client_id?: string | null }[]>([]);
  const [columnsList, setColumnsList] = useState<{ id: string; name: string }[]>([]);

  // Fetch projects when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(messagePreview?.slice(0, 80) || "");
      setProjectId("");
      setColumnId("");
      setColumnsList([]);
      getProjects().then(setProjectsList).catch(() => {});
    }
  }, [open, messagePreview]);

  // Load columns when project changes
  const handleProjectChange = useCallback((pid: string) => {
    setProjectId(pid);
    setColumnId("");
    if (pid) {
      getProjectColumns(pid).then(setColumnsList).catch(() => setColumnsList([]));
    } else {
      setColumnsList([]);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!projectId || !title.trim()) return;
    setLoading(true);
    try {
      const colId = columnId || columnsList[0]?.id;
      if (!colId) { toast.error("No columns found for this project"); return; }
      const task = await createTask(projectId, colId, title.trim(), {
        priority: "medium",
        client_id: clientId || "",
      });
      await linkTaskToConversation(conversationId, task.id, messageId);
      toast.success("Task created");
      onOpenChange(false);
      onTaskCreated?.();
    } catch {
      toast.error("Failed to create task");
    } finally {
      setLoading(false);
    }
  }, [projectId, columnId, columnsList, title, clientId, conversationId, messageId, onOpenChange, onTaskCreated]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create Task from Conversation</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="task-title">Task title</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="task-project">Project</Label>
            <Select value={projectId} onValueChange={handleProjectChange}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a project" /></SelectTrigger>
              <SelectContent>
                {projectsList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {columnsList.length > 0 && (
            <div>
              <Label htmlFor="task-column">Column</Label>
              <Select value={columnId || columnsList[0]?.id || ""} onValueChange={setColumnId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {columnsList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !projectId || !title.trim()}>
            {loading ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
