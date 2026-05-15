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
import { toast } from "sonner";
import { setFollowUp as setFollowUpAction } from "@/app/(app)/comms/actions";

export function SetFollowUpDialog({
  open,
  onOpenChange,
  conversationId,
  onFollowUpSet,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  onFollowUpSet?: () => void;
}) {
  const [followUpDate, setFollowUpDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFollowUpDate("");
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!followUpDate) return;
    setLoading(true);
    try {
      await setFollowUpAction(conversationId, new Date(followUpDate).toISOString());
      toast.success("Follow-up set");
      onOpenChange(false);
      onFollowUpSet?.();
    } catch {
      toast.error("Failed to set follow-up");
    } finally {
      setLoading(false);
    }
  }, [followUpDate, conversationId, onOpenChange, onFollowUpSet]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Set Follow-up Reminder</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="followup-date">Follow-up date & time</Label>
            <Input id="followup-date" type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !followUpDate}>
            {loading ? "Setting..." : "Set Follow-up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
