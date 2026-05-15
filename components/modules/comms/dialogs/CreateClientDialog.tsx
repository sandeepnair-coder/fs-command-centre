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
import { createClientFull } from "@/app/(app)/clients/actions";
import { linkConversationToClient } from "@/app/(app)/comms/actions";

export function CreateClientDialog({
  open,
  onOpenChange,
  conversationId,
  initialEmail,
  initialPhone,
  onClientCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  initialEmail?: string;
  initialPhone?: string;
  onClientCreated?: (clientId: string, clientName: string) => void;
}) {
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState(initialEmail || "");
  const [newClientPhone, setNewClientPhone] = useState(initialPhone || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNewClientName("");
      setNewClientEmail(initialEmail || "");
      setNewClientPhone(initialPhone || "");
    }
  }, [open, initialEmail, initialPhone]);

  const handleSubmit = useCallback(async () => {
    if (!newClientName.trim()) return;
    setLoading(true);
    try {
      const client = await createClientFull({
        name: newClientName.trim(),
        primary_email: newClientEmail.trim() || undefined,
        phone: newClientPhone.trim() || undefined,
      });
      // Auto-link the conversation
      await linkConversationToClient(conversationId, client.id);
      toast.success(`Client "${client.name}" created and linked`);
      onOpenChange(false);
      onClientCreated?.(client.id, client.name);
    } catch {
      toast.error("Failed to create client");
    } finally {
      setLoading(false);
    }
  }, [newClientName, newClientEmail, newClientPhone, conversationId, onOpenChange, onClientCreated]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create New Client</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="new-client-name">Client name</Label>
            <Input id="new-client-name" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Company or person name" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="new-client-email">Email (optional)</Label>
            <Input id="new-client-email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="client@example.com" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="new-client-phone">Phone (optional)</Label>
            <Input id="new-client-phone" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="+91 98765 43210" className="mt-1" />
          </div>
          <p className="text-[10px] text-muted-foreground text-pretty">The conversation will be automatically linked to this new client.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !newClientName.trim()}>
            {loading ? "Creating..." : "Create & Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
