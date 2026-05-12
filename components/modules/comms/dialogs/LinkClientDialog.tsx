"use client";

import { useState, useCallback, useEffect } from "react";
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
import { linkConversationToClient } from "@/app/(app)/comms/actions";
import { getClients } from "@/app/(app)/tasks/actions";

export function LinkClientDialog({
  open,
  onOpenChange,
  conversationId,
  onClientLinked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  onClientLinked?: (clientId: string, clientName: string) => void;
}) {
  const [linkClientId, setLinkClientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientsList, setClientsList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (open) {
      setLinkClientId("");
      getClients().then(setClientsList).catch(() => {});
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!linkClientId) return;
    setLoading(true);
    try {
      await linkConversationToClient(conversationId, linkClientId);
      const client = clientsList.find((c) => c.id === linkClientId);
      toast.success("Conversation linked to client");
      onOpenChange(false);
      onClientLinked?.(linkClientId, client?.name || "Linked");
    } catch {
      toast.error("Failed to link client");
    } finally {
      setLoading(false);
    }
  }, [linkClientId, conversationId, clientsList, onOpenChange, onClientLinked]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Link Conversation to Client</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="link-client">Select client</Label>
            <Select value={linkClientId} onValueChange={setLinkClientId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a client" /></SelectTrigger>
              <SelectContent>
                {clientsList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !linkClientId}>
            {loading ? "Linking..." : "Link Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
