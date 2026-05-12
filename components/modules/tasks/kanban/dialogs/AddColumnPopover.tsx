"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Columns3 } from "lucide-react";
import { createColumn } from "@/app/(app)/tasks/actions";
import { toast } from "sonner";
import type { ProjectColumn } from "@/lib/types/tasks";

export function AddColumnPopover({
  projectId,
  onColumnCreated,
}: {
  projectId: string;
  onColumnCreated: (column: ProjectColumn) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function handleAddColumn() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    setOpen(false);
    try {
      const col = await createColumn(projectId, trimmed);
      onColumnCreated({ ...col, tasks: [] });
    } catch {
      toast.error("Column didn't save. Try again?");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., In Progress"
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddColumn();
              if (e.key === "Escape") {
                setOpen(false);
                setName("");
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
                setOpen(false);
                setName("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
