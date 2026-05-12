"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { createProject, getClients } from "@/app/(app)/tasks/actions";

export function CreateProjectDialog({
  open,
  onOpenChange,
  clientId,
  onProjectCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  onProjectCreated?: () => void;
}) {
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientsList, setClientsList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (open) {
      setProjectName("");
      setProjectDesc("");
      setSelectedClientId("");
      if (!clientId) {
        getClients().then(setClientsList).catch(() => {});
      }
    }
  }, [open, clientId]);

  const handleSubmit = useCallback(async () => {
    if (!projectName.trim()) return;
    setLoading(true);
    try {
      await createProject({
        name: projectName.trim(),
        client_id: clientId || selectedClientId || null,
        description: projectDesc.trim() || null,
      });
      toast.success("Project created");
      onOpenChange(false);
      onProjectCreated?.();
    } catch {
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  }, [projectName, projectDesc, clientId, selectedClientId, onOpenChange, onProjectCreated]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="proj-name">Project name</Label>
            <Input id="proj-name" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Website Redesign" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="proj-desc">Description (optional)</Label>
            <Textarea id="proj-desc" value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} placeholder="Brief project description" className="mt-1" rows={2} />
          </div>
          {!clientId && (
            <div>
              <Label htmlFor="proj-client">Link to client (optional)</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>
                  {clientsList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !projectName.trim()}>
            {loading ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
