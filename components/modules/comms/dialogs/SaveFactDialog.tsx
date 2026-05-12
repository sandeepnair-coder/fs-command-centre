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
import { toast } from "sonner";
import { upsertClientFact } from "@/app/(app)/clients/actions";

export function SaveFactDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  initialValue,
  onFactSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  initialValue?: string;
  onFactSaved?: () => void;
}) {
  const [factKey, setFactKey] = useState("");
  const [factValue, setFactValue] = useState(initialValue || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFactKey("");
      setFactValue(initialValue || "");
    }
  }, [open, initialValue]);

  const handleSubmit = useCallback(async () => {
    if (!factKey.trim() || !factValue.trim()) return;
    setLoading(true);
    try {
      await upsertClientFact({
        client_id: clientId,
        key: factKey.trim(),
        value: factValue.trim(),
      });
      toast.success("Fact saved to client profile");
      onOpenChange(false);
      onFactSaved?.();
    } catch {
      toast.error("Failed to save fact");
    } finally {
      setLoading(false);
    }
  }, [factKey, factValue, clientId, onOpenChange, onFactSaved]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Save Fact to {clientName}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="fact-key">Fact label</Label>
            <Input id="fact-key" value={factKey} onChange={(e) => setFactKey(e.target.value)} placeholder="e.g. brand_color, preferred_format" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="fact-value">Value</Label>
            <Textarea id="fact-value" value={factValue} onChange={(e) => setFactValue(e.target.value)} placeholder="e.g. #2D7F3A" className="mt-1" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !factKey.trim() || !factValue.trim()}>
            {loading ? "Saving..." : "Save Fact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
