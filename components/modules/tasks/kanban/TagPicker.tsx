"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, X } from "lucide-react";
import type { Tag } from "@/lib/types/tasks";
import { TAG_COLORS } from "@/lib/types/tasks";
import {
  getAllTags,
  createTag,
  addTagToTask,
  removeTagFromTask,
} from "@/app/(app)/tasks/tag-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function getTagStyle(color: string) {
  return TAG_COLORS.find((c) => c.name === color) || TAG_COLORS[0];
}

export function TagChip({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  const style = getTagStyle(tag.color);
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", style.bg, style.text)}>
      {tag.name}
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="hover:opacity-70">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

export function TagPicker({
  taskId,
  tags,
  onTagsChange,
}: {
  taskId: string;
  tags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
}) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newTagColor, setNewTagColor] = useState("blue");

  useEffect(() => {
    if (open) {
      getAllTags().then(setAllTags).catch(() => {});
    }
  }, [open]);

  const tagIds = new Set(tags.map((t) => t.id));
  const availableTags = allTags.filter(
    (t) => !tagIds.has(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
  );
  const canCreate = search.trim() && !allTags.some((t) => t.name.toLowerCase() === search.trim().toLowerCase());

  async function handleAdd(tag: Tag) {
    try {
      await addTagToTask(taskId, tag.id);
      onTagsChange([...tags, tag]);
    } catch {
      toast.error("Couldn't add tag.");
    }
  }

  async function handleRemove(tagId: string) {
    try {
      await removeTagFromTask(taskId, tagId);
      onTagsChange(tags.filter((t) => t.id !== tagId));
    } catch {
      toast.error("Couldn't remove tag.");
    }
  }

  async function handleCreate() {
    if (!search.trim()) return;
    try {
      const tag = await createTag(search.trim(), newTagColor);
      await addTagToTask(taskId, tag.id);
      onTagsChange([...tags, tag]);
      setAllTags((prev) => [...prev, tag]);
      setSearch("");
      setShowColorPicker(false);
    } catch {
      toast.error("Couldn't create tag.");
    }
  }

  return (
    <div className="space-y-2">
      {/* Current tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} onRemove={() => handleRemove(tag.id)} />
          ))}
        </div>
      )}

      {/* Add tag button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
            <Plus className="mr-1 h-3 w-3" /> Add tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or create tag..."
            className="h-7 text-xs mb-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCreate) {
                setShowColorPicker(true);
              }
            }}
          />

          {/* Available tags */}
          <div className="max-h-[150px] overflow-y-auto space-y-0.5">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleAdd(tag)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-muted text-xs text-left"
              >
                <span className={cn("h-2.5 w-2.5 rounded-full", getTagStyle(tag.color).dot)} />
                {tag.name}
              </button>
            ))}
          </div>

          {/* Create new tag */}
          {canCreate && !showColorPicker && (
            <button
              onClick={() => setShowColorPicker(true)}
              className="w-full flex items-center gap-2 px-2 py-1 mt-1 rounded hover:bg-muted text-xs text-left text-primary"
            >
              <Plus className="h-3 w-3" />
              Create &ldquo;{search.trim()}&rdquo;
            </button>
          )}

          {/* Color picker */}
          {showColorPicker && (
            <div className="mt-2 border-t pt-2">
              <p className="text-[10px] text-muted-foreground mb-1">Pick a color:</p>
              <div className="flex flex-wrap gap-1.5">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setNewTagColor(c.name)}
                    className={cn(
                      "h-5 w-5 rounded-full transition-all",
                      c.dot,
                      newTagColor === c.name ? "ring-2 ring-offset-1 ring-primary" : ""
                    )}
                  />
                ))}
              </div>
              <Button size="sm" className="h-6 text-xs w-full mt-2" onClick={handleCreate}>
                Create Tag
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
