"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChevronRight,
  Building2,
  User,
  Palette,
  FileText,
  Brain,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createClientFull,
  batchCreateClientExtras,
} from "@/app/(app)/clients/actions";
import { toast } from "sonner";
import { SUCCESS } from "@/lib/copy";
import type { IntakeForm } from "@/lib/types/clients";
import { emptyForm } from "@/lib/types/clients";
import { QuickIntakeTab } from "./intake/QuickIntakeTab";
import { AdvancedIntakeTab } from "./intake/AdvancedIntakeTab";
import { BillingIntakeTab } from "./intake/BillingIntakeTab";

// ─── Enrichment (best-effort, fire-and-forget) ─────────────────────────────

function triggerEnrichment(client: { id: string; name: string; primary_email?: string | null; website?: string | null }, onDone?: () => void) {
  fetch("/api/clients/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: client.id,
      name: client.name,
      email: client.primary_email || undefined,
      website: client.website || undefined,
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.enriched > 0) {
        const parts: string[] = [];
        if (data.fields_updated?.length) parts.push(`${data.fields_updated.length} profile field${data.fields_updated.length > 1 ? "s" : ""}`);
        if (data.facts_written > 0) parts.push(`${data.facts_written} intel fact${data.facts_written > 1 ? "s" : ""}`);
        toast.success("Auto-enrichment complete", {
          description: `Discovered ${parts.join(" and ")} from ${(data.sources_checked || []).join(", ")}.`,
        });
        onDone?.();
      }
    })
    .catch(() => {
      // Enrichment is best-effort — don't show error
    });
}

// ─── Section nav config ─────────────────────────────────────────────────────

const SECTIONS = [
  { id: "basic", label: "Basic Details", icon: Building2 },
  { id: "contacts", label: "Contacts", icon: User },
  { id: "brand", label: "Brand & Web", icon: Palette },
  { id: "assets", label: "Assets", icon: FileText },
  { id: "intelligence", label: "Intelligence", icon: Brain },
  { id: "billing", label: "Billing & Tax", icon: Receipt },
] as const;

// ═════════════════════════════════════════════════════════════════════════════

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: () => void;
}

export function AddClientDialog({ open, onOpenChange, onClientCreated }: AddClientDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState<IntakeForm>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("basic");

  const updateField = useCallback(<K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  function resetForm() {
    setForm(emptyForm());
    setActiveSection("basic");
  }

  // ── Quick create ──────────────────────────────────────────────────────────

  async function handleQuickCreate() {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const client = await createClientFull({
        name: form.name.trim(),
        primary_email: form.primary_email.trim() || undefined,
        website: form.website.trim() || undefined,
        industry: form.industry.trim() || undefined,
      });
      toast.success(SUCCESS.clientCreated);
      onOpenChange(false);
      resetForm();
      onClientCreated();
      // Fire-and-forget deep research
      triggerEnrichment(client, onClientCreated);
    } catch {
      toast.error("Couldn't create the client. Try again?");
    } finally {
      setCreating(false);
    }
  }

  // ── Switch to advanced ────────────────────────────────────────────────────

  function switchToAdvanced() {
    onOpenChange(false);
    // Small delay so dialog closes before sheet opens
    setTimeout(() => setAdvancedOpen(true), 150);
  }

  // ── Advanced create ───────────────────────────────────────────────────────

  async function handleAdvancedCreate() {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      // 1. Create client with all direct fields
      const client = await createClientFull({
        name: form.name.trim(),
        company_name: form.company_name || undefined,
        display_name: form.display_name || undefined,
        primary_email: form.primary_email || undefined,
        website: form.website || undefined,
        phone: form.phone || undefined,
        timezone: form.timezone || undefined,
        industry: form.industry || undefined,
        business_type: form.business_type || undefined,
        country: form.country || undefined,
        state: form.state || undefined,
        city: form.city || undefined,
        notes: form.notes || undefined,
        billing_legal_name: form.billing_legal_name || undefined,
        billing_name: form.billing_name || undefined,
        gst_number: form.gst_number || undefined,
        pan: form.pan || undefined,
        cin: form.cin || undefined,
        billing_email: form.billing_email || undefined,
        billing_phone: form.billing_phone || undefined,
        billing_address_line1: form.billing_address_line1 || undefined,
        billing_address_line2: form.billing_address_line2 || undefined,
        billing_city: form.billing_city || undefined,
        billing_state: form.billing_state || undefined,
        billing_postal_code: form.billing_postal_code || undefined,
        billing_country: form.billing_country || undefined,
        finance_contact_name: form.finance_contact_name || undefined,
        finance_contact_email: form.finance_contact_email || undefined,
        finance_contact_phone: form.finance_contact_phone || undefined,
        payment_terms: form.payment_terms || undefined,
        currency: form.currency || undefined,
        po_invoice_notes: form.po_invoice_notes || undefined,
        tax_notes: form.tax_notes || undefined,
      });

      // 2. Batch create contacts, facts, assets
      const facts: { key: string; value: string }[] = [];
      const brandKeys = ["instagram", "facebook", "linkedin", "youtube", "twitter", "target_audience", "tone_voice", "positioning", "brand_notes", "preferred_channel"] as const;
      for (const k of brandKeys) {
        if (form[k].trim()) facts.push({ key: k, value: form[k].trim() });
      }
      const intelKeys = ["client_summary", "key_preferences", "working_style", "constraints", "urgency_notes", "internal_notes"] as const;
      for (const k of intelKeys) {
        if (form[k].trim()) facts.push({ key: k, value: form[k].trim() });
      }

      const hasExtras =
        form.contacts.some((c) => c.name.trim()) ||
        facts.length > 0 ||
        form.assets.some((a) => a.file_name.trim() && a.storage_url.trim());

      if (hasExtras) {
        await batchCreateClientExtras(client.id, {
          contacts: form.contacts.filter((c) => c.name.trim()),
          facts,
          assets: form.assets.filter((a) => a.file_name.trim() && a.storage_url.trim()),
        });
      }

      toast.success(SUCCESS.clientCreated);
      setAdvancedOpen(false);
      resetForm();
      // Fire-and-forget deep research
      triggerEnrichment(client, onClientCreated);
      // Navigate to the new client profile
      router.push(`/clients/${client.id}`);
    } catch {
      toast.error("Couldn't create the client. Try again?");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {/* ═══ Quick Intake Dialog ═══ */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Client</DialogTitle>
          </DialogHeader>
          <QuickIntakeTab
            form={form}
            updateField={updateField}
            creating={creating}
            onSubmit={handleQuickCreate}
          />
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground justify-start sm:mr-auto"
              onClick={switchToAdvanced}
            >
              Advanced Intake <ChevronRight className="ml-0.5 size-3" />
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="ghost" size="sm">Cancel</Button>
              </DialogClose>
              <Button
                size="sm"
                onClick={handleQuickCreate}
                disabled={creating || !form.name.trim()}
              >
                {creating ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Advanced Intake Sheet ═══ */}
      <Sheet open={advancedOpen} onOpenChange={(o) => { if (!o) setAdvancedOpen(false); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="text-lg">Advanced Client Intake</SheetTitle>
            <p className="text-xs text-muted-foreground text-pretty">
              Fill in what you know now — everything is optional except the client name. You can always add more later.
            </p>
          </SheetHeader>

          {/* Section nav */}
          <div className="px-6 py-3 border-b shrink-0 overflow-x-auto">
            <div className="flex gap-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                    activeSection === s.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  <s.icon className="size-3" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section content */}
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-5">
              {activeSection === "billing" ? (
                <BillingIntakeTab form={form} updateField={updateField} />
              ) : (
                <AdvancedIntakeTab form={form} updateField={updateField} activeSection={activeSection} />
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {form.name.trim() ? `Creating: ${form.name.trim()}` : "Client name is required"}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdvancedOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleAdvancedCreate}
                disabled={creating || !form.name.trim()}
              >
                {creating ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
