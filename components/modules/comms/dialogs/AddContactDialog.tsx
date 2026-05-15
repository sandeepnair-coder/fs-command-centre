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
import { createClientContact } from "@/app/(app)/clients/actions";

export function AddContactDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  initialName,
  initialEmail,
  onContactAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  initialName?: string;
  initialEmail?: string;
  onContactAdded?: () => void;
}) {
  const [contactName, setContactName] = useState(initialName || "");
  const [contactRole, setContactRole] = useState("");
  const [contactEmail, setContactEmail] = useState(initialEmail || "");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setContactName(initialName || "");
      setContactRole("");
      setContactEmail(initialEmail || "");
      setContactPhone("");
    }
  }, [open, initialName, initialEmail]);

  const handleSubmit = useCallback(async () => {
    if (!contactName.trim()) return;
    setLoading(true);
    try {
      await createClientContact({
        client_id: clientId,
        name: contactName.trim(),
        role: contactRole.trim() || undefined,
        email: contactEmail.trim() || undefined,
        phone: contactPhone.trim() || undefined,
      });
      toast.success("Contact added");
      onOpenChange(false);
      onContactAdded?.();
    } catch {
      toast.error("Failed to add contact");
    } finally {
      setLoading(false);
    }
  }, [contactName, contactRole, contactEmail, contactPhone, clientId, onOpenChange, onContactAdded]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Contact to {clientName}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="contact-name">Name</Label>
            <Input id="contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full name" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="contact-role">Role (optional)</Label>
            <Input id="contact-role" value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="e.g. Marketing Lead" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="contact-email">Email (optional)</Label>
            <Input id="contact-email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@example.com" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="contact-phone">Phone (optional)</Label>
            <Input id="contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 98765 43210" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !contactName.trim()}>
            {loading ? "Adding..." : "Add Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
