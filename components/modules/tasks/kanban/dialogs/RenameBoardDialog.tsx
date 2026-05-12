"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { renameProject } from "@/app/(app)/tasks/actions";
import { toast } from "sonner";
import { SUCCESS } from "@/lib/copy";

export function RenameBoardDialog({
  open,
  onOpenChange,
  projectId,
  currentName,
  onRenamed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentName: string;
  onRenamed: (newName: string) => void;
}) {
  const [name, setName] = useState(currentName);

  // Sync internal state when the dialog opens with a new name
  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  async function handleRename() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await renameProject(projectId, trimmed);
      onRenamed(trimmed);
      onOpenChange(false);
      toast.success(SUCCESS.boardRenamed);
    } catch {
      toast.error("Couldn't rename the board. Try again?");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename Board</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Board name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm" onClick={handleRename} disabled={!name.trim()}>
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
