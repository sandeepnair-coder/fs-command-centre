"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Plus,
  Search,
  Globe,
  Mail,
  ListChecks,
  MessageSquare,
  Users,
  X,
  ChevronRight,
  Building2,
  User,
  Palette,
  FileText,
  Brain,
  Receipt,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getClientStats,
  createClientFull,
  batchCreateClientExtras,
  createClientContact,
  upsertClientFact,
  createBrandAsset,
  deleteClient,
} from "@/app/(app)/clients/actions";
import type { Client, BrandAsset } from "@/lib/types/comms";
import { toast } from "sonner";
import { SUCCESS, EMPTY } from "@/lib/copy";

function triggerEnrichment(client: { id: string; name: string; primary_email?: string | null; website?: string | null }) {
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
        toast.success("Client data updated", {
          description: `${data.enriched} intel fact${data.enriched > 1 ? "s" : ""} discovered and added.`,
        });
      }
    })
    .catch(() => {
      // Enrichment is best-effort — don't show error
    });
}

type ClientStat = {
  id: string;
  name: string;
  primary_email: string | null;
  website: string | null;
  industry: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  task_count: number;
  conversation_count: number;
  thumbnail_url?: string | null;
};

// ─── Intake form shape ───────────────────────────────────────────────────────

type IntakeContact = {
  name: string;
  role: string;
  email: string;
  phone: string;
  is_primary: boolean;
  is_billing: boolean;
  notes: string;
};

type IntakeAsset = {
  file_name: string;
  storage_url: string;
  type: BrandAsset["type"];
};

type IntakeForm = {
  // Basic
  name: string;
  company_name: string;
  display_name: string;
  primary_email: string;
  website: string;
  phone: string;
  industry: string;
  business_type: string;
  timezone: string;
  country: string;
  state: string;
  city: string;
  notes: string;
  // Contacts
  contacts: IntakeContact[];
  // Brand (stored as facts)
  instagram: string;
  facebook: string;
  linkedin: string;
  youtube: string;
  twitter: string;
  target_audience: string;
  tone_voice: string;
  positioning: string;
  brand_notes: string;
  preferred_channel: string;
  // Assets
  assets: IntakeAsset[];
  // Intelligence (stored as facts)
  client_summary: string;
  key_preferences: string;
  working_style: string;
  constraints: string;
  urgency_notes: string;
  internal_notes: string;
  // Billing
  billing_legal_name: string;
  billing_name: string;
  gst_number: string;
  pan: string;
  cin: string;
  billing_email: string;
  billing_phone: string;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_state: string;
  billing_postal_code: string;
  billing_country: string;
  finance_contact_name: string;
  finance_contact_email: string;
  finance_contact_phone: string;
  payment_terms: string;
  currency: string;
  po_invoice_notes: string;
  tax_notes: string;
};

const EMPTY_CONTACT: IntakeContact = { name: "", role: "", email: "", phone: "", is_primary: false, is_billing: false, notes: "" };
const EMPTY_ASSET: IntakeAsset = { file_name: "", storage_url: "", type: "other" };

function emptyForm(): IntakeForm {
  return {
    name: "", company_name: "", display_name: "", primary_email: "", website: "",
    phone: "", industry: "", business_type: "", timezone: "", country: "", state: "", city: "", notes: "",
    contacts: [],
    instagram: "", facebook: "", linkedin: "", youtube: "", twitter: "",
    target_audience: "", tone_voice: "", positioning: "", brand_notes: "", preferred_channel: "",
    assets: [],
    client_summary: "", key_preferences: "", working_style: "", constraints: "",
    urgency_notes: "", internal_notes: "",
    billing_legal_name: "", billing_name: "", gst_number: "", pan: "", cin: "",
    billing_email: "", billing_phone: "", billing_address_line1: "", billing_address_line2: "",
    billing_city: "", billing_state: "", billing_postal_code: "", billing_country: "",
    finance_contact_name: "", finance_contact_email: "", finance_contact_phone: "",
    payment_terms: "", currency: "INR", po_invoice_notes: "", tax_notes: "",
  };
}

// ─── Advanced Intake Sections ────────────────────────────────────────────────

const SECTIONS = [
  { id: "basic", label: "Basic Details", icon: Building2 },
  { id: "contacts", label: "Contacts", icon: User },
  { id: "brand", label: "Brand & Web", icon: Palette },
  { id: "assets", label: "Assets", icon: FileText },
  { id: "intelligence", label: "Intelligence", icon: Brain },
  { id: "billing", label: "Billing & Tax", icon: Receipt },
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export function ClientsShell({ initialClients = [] }: { initialClients?: ClientStat[] } = {}) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientStat[]>(initialClients);
  const [loading, setLoading] = useState(initialClients.length === 0);
  const [search, setSearch] = useState("");

  // Quick intake dialog
  const [quickOpen, setQuickOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Advanced intake sheet
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Shared form state (carries between Quick → Advanced)
  const [form, setForm] = useState<IntakeForm>(emptyForm);

  // Active section in advanced view
  const [activeSection, setActiveSection] = useState("basic");

  // Selection + bulk delete
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (initialClients.length === 0) loadClients(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  async function loadClients() {
    setLoading(true);
    try {
      const data = await getClientStats();
      setClients(data);
    } catch {
      // Tables may not exist yet
    } finally {
      setLoading(false);
    }
  }

  const updateField = useCallback(<K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  function resetForm() {
    setForm(emptyForm());
    setActiveSection("basic");
  }

  // ── Quick create ────────────────────────────────────────────────────────────

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
      setQuickOpen(false);
      resetForm();
      loadClients();
      // Fire-and-forget deep research
      triggerEnrichment(client);
    } catch {
      toast.error("Couldn't create the client. Try again?");
    } finally {
      setCreating(false);
    }
  }

  // ── Transition to advanced ──────────────────────────────────────────────────

  function switchToAdvanced() {
    setQuickOpen(false);
    // Small delay so dialog closes before sheet opens
    setTimeout(() => setAdvancedOpen(true), 150);
  }

  // ── Advanced create ─────────────────────────────────────────────────────────

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
      triggerEnrichment(client);
      // Navigate to the new client profile
      router.push(`/clients/${client.id}`);
    } catch {
      toast.error("Couldn't create the client. Try again?");
    } finally {
      setCreating(false);
    }
  }

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.primary_email?.toLowerCase().includes(q) ||
      c.industry?.toLowerCase().includes(q)
    );
  });

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someSelected = filtered.some((c) => selected.has(c.id));

  function toggleSelect(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }
  async function handleBulkDelete() {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      await Promise.all([...selected].map((id) => deleteClient(id)));
      setClients((prev) => prev.filter((c) => !selected.has(c.id)));
      toast.success(`${selected.size} client${selected.size > 1 ? "s" : ""} deleted`);
      setSelected(new Set());
    } catch {
      toast.error("Some clients couldn't be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-36 rounded-xl border bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3 shrink-0">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label={allSelected ? "Deselect all" : "Select all"}
        >
          {allSelected ? <CheckSquare className="size-4 text-primary" /> : someSelected ? <MinusSquare className="size-4 text-primary" /> : <Square className="size-4" />}
          {allSelected ? "Deselect all" : "Select all"}
        </button>

        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs"
            onClick={handleBulkDelete}
            disabled={deleting}
          >
            <Trash2 className="mr-1 size-3.5" />
            {deleting ? "Deleting..." : `Delete ${selected.size} client${selected.size > 1 ? "s" : ""}`}
          </Button>
        )}

        <div className="relative flex-1 max-w-sm ml-auto">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="h-9 pl-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Button size="sm" className="h-9" onClick={() => { resetForm(); setQuickOpen(true); }}>
          <Plus className="mr-1 size-4" />
          Add Client
        </Button>
      </div>

      {/* ═══ Quick Intake Dialog ═══ */}
      <Dialog open={quickOpen} onOpenChange={(open) => { if (!open) setQuickOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="quick-name" className="text-sm">
                Client / Brand Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quick-name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. GreenLeaf Organics"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && !creating) handleQuickCreate(); }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Email</Label>
                <Input
                  value={form.primary_email}
                  onChange={(e) => updateField("primary_email", e.target.value)}
                  placeholder="hello@client.com"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="www.client.com"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-sm">Industry</Label>
                <Input
                  value={form.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                  placeholder="e.g. F&B, Fashion, Tech"
                  className="h-9"
                />
              </div>
            </div>
          </div>
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
      <Sheet open={advancedOpen} onOpenChange={(open) => { if (!open) setAdvancedOpen(false); }}>
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

              {/* ─── A. Basic Details ─── */}
              {activeSection === "basic" && (
                <div className="space-y-4">
                  <SectionTitle>Basic Client Details</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Client / Brand Name" required value={form.name} onChange={(v) => updateField("name", v)} placeholder="e.g. GreenLeaf Organics" autoFocus />
                    <FormField label="Company / Legal Entity" value={form.company_name} onChange={(v) => updateField("company_name", v)} placeholder="e.g. GreenLeaf Pvt Ltd" />
                    <FormField label="Display Name" value={form.display_name} onChange={(v) => updateField("display_name", v)} placeholder="Brand display name" />
                    <FormField label="Primary Email" value={form.primary_email} onChange={(v) => updateField("primary_email", v)} placeholder="hello@client.com" />
                    <FormField label="Website" value={form.website} onChange={(v) => updateField("website", v)} placeholder="www.client.com" />
                    <FormField label="Phone" value={form.phone} onChange={(v) => updateField("phone", v)} placeholder="+91 98765 43210" />
                    <FormField label="Industry" value={form.industry} onChange={(v) => updateField("industry", v)} placeholder="e.g. F&B, Fashion, Tech" />
                    <FormField label="Business Type" value={form.business_type} onChange={(v) => updateField("business_type", v)} placeholder="e.g. Pvt Ltd, LLP, Sole Prop" />
                    <FormField label="Timezone" value={form.timezone} onChange={(v) => updateField("timezone", v)} placeholder="e.g. IST, EST" />
                    <FormField label="Country" value={form.country} onChange={(v) => updateField("country", v)} placeholder="e.g. India" />
                    <FormField label="State / Region" value={form.state} onChange={(v) => updateField("state", v)} placeholder="e.g. Maharashtra" />
                    <FormField label="City" value={form.city} onChange={(v) => updateField("city", v)} placeholder="e.g. Mumbai" />
                  </div>
                </div>
              )}

              {/* ─── B. Contacts ─── */}
              {activeSection === "contacts" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionTitle>Contacts</SectionTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => updateField("contacts", [...form.contacts, { ...EMPTY_CONTACT }])}
                    >
                      <Plus className="mr-1 size-3" /> Add Contact
                    </Button>
                  </div>
                  {form.contacts.length === 0 ? (
                    <EmptySection icon={User} text="No contacts added yet." sub="Click 'Add Contact' to add a key person for this client." />
                  ) : (
                    <div className="space-y-3">
                      {form.contacts.map((contact, i) => (
                        <div key={i} className="rounded-lg border p-3 space-y-3 relative group">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 size-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={() => updateField("contacts", form.contacts.filter((_, j) => j !== i))}
                            aria-label="Remove contact"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                          <div className="grid grid-cols-2 gap-3">
                            <FormField label="Name" required value={contact.name} onChange={(v) => {
                              const next = [...form.contacts]; next[i] = { ...next[i], name: v }; updateField("contacts", next);
                            }} placeholder="Full name" />
                            <FormField label="Role / Designation" value={contact.role} onChange={(v) => {
                              const next = [...form.contacts]; next[i] = { ...next[i], role: v }; updateField("contacts", next);
                            }} placeholder="e.g. Marketing Lead" />
                            <FormField label="Email" value={contact.email} onChange={(v) => {
                              const next = [...form.contacts]; next[i] = { ...next[i], email: v }; updateField("contacts", next);
                            }} placeholder="email@example.com" />
                            <FormField label="Phone" value={contact.phone} onChange={(v) => {
                              const next = [...form.contacts]; next[i] = { ...next[i], phone: v }; updateField("contacts", next);
                            }} placeholder="+91 98765 43210" />
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                              <input type="checkbox" checked={contact.is_primary} onChange={(e) => {
                                const next = [...form.contacts]; next[i] = { ...next[i], is_primary: e.target.checked }; updateField("contacts", next);
                              }} className="rounded" />
                              Primary Contact
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                              <input type="checkbox" checked={contact.is_billing} onChange={(e) => {
                                const next = [...form.contacts]; next[i] = { ...next[i], is_billing: e.target.checked }; updateField("contacts", next);
                              }} className="rounded" />
                              Billing / Finance
                            </label>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Notes</Label>
                            <Input value={contact.notes} onChange={(e) => {
                              const next = [...form.contacts]; next[i] = { ...next[i], notes: e.target.value }; updateField("contacts", next);
                            }} placeholder="Any context about this contact" className="h-8 text-sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── C. Brand & Web ─── */}
              {activeSection === "brand" && (
                <div className="space-y-4">
                  <SectionTitle>Brand & Web</SectionTitle>
                  <p className="text-xs text-muted-foreground text-pretty -mt-2">Social handles, audience, positioning, and communication preferences.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Instagram" value={form.instagram} onChange={(v) => updateField("instagram", v)} placeholder="@handle" />
                    <FormField label="Facebook" value={form.facebook} onChange={(v) => updateField("facebook", v)} placeholder="Page URL or handle" />
                    <FormField label="LinkedIn" value={form.linkedin} onChange={(v) => updateField("linkedin", v)} placeholder="Company page URL" />
                    <FormField label="YouTube" value={form.youtube} onChange={(v) => updateField("youtube", v)} placeholder="Channel URL" />
                    <FormField label="Twitter / X" value={form.twitter} onChange={(v) => updateField("twitter", v)} placeholder="@handle" />
                    <FormField label="Preferred Channel" value={form.preferred_channel} onChange={(v) => updateField("preferred_channel", v)} placeholder="e.g. WhatsApp, Email" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 pt-1">
                    <FormArea label="Target Audience" value={form.target_audience} onChange={(v) => updateField("target_audience", v)} placeholder="Who does this brand speak to?" />
                    <FormArea label="Tone of Voice" value={form.tone_voice} onChange={(v) => updateField("tone_voice", v)} placeholder="e.g. Professional but warm, Gen-Z friendly" />
                    <FormArea label="Positioning" value={form.positioning} onChange={(v) => updateField("positioning", v)} placeholder="How does this brand position itself?" />
                    <FormArea label="Brand Notes" value={form.brand_notes} onChange={(v) => updateField("brand_notes", v)} placeholder="Any other brand context" />
                  </div>
                </div>
              )}

              {/* ─── D. Assets ─── */}
              {activeSection === "assets" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionTitle>Assets</SectionTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => updateField("assets", [...form.assets, { ...EMPTY_ASSET }])}
                    >
                      <Plus className="mr-1 size-3" /> Add Asset
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-pretty -mt-2">Brand kits, logos, guidelines, decks — add links to files or folders.</p>
                  {form.assets.length === 0 ? (
                    <EmptySection icon={FileText} text="No assets added yet." sub="Click 'Add Asset' to link brand kits, logos, drive folders, or decks." />
                  ) : (
                    <div className="space-y-3">
                      {form.assets.map((asset, i) => (
                        <div key={i} className="rounded-lg border p-3 space-y-3 relative group">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 size-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={() => updateField("assets", form.assets.filter((_, j) => j !== i))}
                            aria-label="Remove asset"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Type</Label>
                              <Select value={asset.type} onValueChange={(v) => {
                                const next = [...form.assets]; next[i] = { ...next[i], type: v as BrandAsset["type"] }; updateField("assets", next);
                              }}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(["brand_kit", "logo", "font", "guideline", "deck", "brief", "other"] as const).map((t) => (
                                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <FormField label="File Name" value={asset.file_name} onChange={(v) => {
                              const next = [...form.assets]; next[i] = { ...next[i], file_name: v }; updateField("assets", next);
                            }} placeholder="e.g. BrandKit_v2.pdf" />
                            <FormField label="URL / Link" value={asset.storage_url} onChange={(v) => {
                              const next = [...form.assets]; next[i] = { ...next[i], storage_url: v }; updateField("assets", next);
                            }} placeholder="https://drive.google.com/..." />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── E. Intelligence ─── */}
              {activeSection === "intelligence" && (
                <div className="space-y-4">
                  <SectionTitle>Intelligence / Internal Notes</SectionTitle>
                  <p className="text-xs text-muted-foreground text-pretty -mt-2">Internal context that helps the team work better with this client.</p>
                  <div className="grid grid-cols-1 gap-3">
                    <FormArea label="Client Summary" value={form.client_summary} onChange={(v) => updateField("client_summary", v)} placeholder="Brief overview of this client and what they need" />
                    <FormArea label="Key Preferences" value={form.key_preferences} onChange={(v) => updateField("key_preferences", v)} placeholder="Communication style, design preferences, do's and don'ts" />
                    <FormArea label="Working Style" value={form.working_style} onChange={(v) => updateField("working_style", v)} placeholder="How this client likes to work — feedback style, review cadence" />
                    <FormArea label="Important Constraints" value={form.constraints} onChange={(v) => updateField("constraints", v)} placeholder="Budget limits, brand restrictions, approval chains" />
                    <FormArea label="Deadlines / Urgency Notes" value={form.urgency_notes} onChange={(v) => updateField("urgency_notes", v)} placeholder="Recurring deadlines, peak seasons, urgency patterns" />
                    <FormArea label="Internal Notes" value={form.internal_notes} onChange={(v) => updateField("internal_notes", v)} placeholder="Anything else the team should know" />
                  </div>
                </div>
              )}

              {/* ─── F. Billing & Tax ─── */}
              {activeSection === "billing" && (
                <div className="space-y-4">
                  <SectionTitle>Billing & Tax Details</SectionTitle>
                  <p className="text-xs text-muted-foreground text-pretty -mt-2">Tax registration, billing address, and finance contact for invoicing.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Legal Entity Name" value={form.billing_legal_name} onChange={(v) => updateField("billing_legal_name", v)} placeholder="As on tax registration" />
                    <FormField label="Billing Name" value={form.billing_name} onChange={(v) => updateField("billing_name", v)} placeholder="Name on invoices" />
                    <FormField label="GST / VAT / Tax ID" value={form.gst_number} onChange={(v) => updateField("gst_number", v)} placeholder="e.g. 27AABCG1234A1Z5" />
                    <FormField label="PAN" value={form.pan} onChange={(v) => updateField("pan", v)} placeholder="e.g. AABCG1234A" />
                    <FormField label="CIN / Registration No." value={form.cin} onChange={(v) => updateField("cin", v)} placeholder="Business registration number" />
                    <FormField label="Billing Email" value={form.billing_email} onChange={(v) => updateField("billing_email", v)} placeholder="billing@client.com" />
                    <FormField label="Billing Phone" value={form.billing_phone} onChange={(v) => updateField("billing_phone", v)} placeholder="+91 98765 43210" />
                    <div className="col-span-2" />
                    <FormField label="Billing Address Line 1" value={form.billing_address_line1} onChange={(v) => updateField("billing_address_line1", v)} placeholder="Street address" className="col-span-2" />
                    <FormField label="Billing Address Line 2" value={form.billing_address_line2} onChange={(v) => updateField("billing_address_line2", v)} placeholder="Suite, floor, etc." className="col-span-2" />
                    <FormField label="City" value={form.billing_city} onChange={(v) => updateField("billing_city", v)} placeholder="City" />
                    <FormField label="State" value={form.billing_state} onChange={(v) => updateField("billing_state", v)} placeholder="State" />
                    <FormField label="Postal Code" value={form.billing_postal_code} onChange={(v) => updateField("billing_postal_code", v)} placeholder="PIN / ZIP" />
                    <FormField label="Country" value={form.billing_country} onChange={(v) => updateField("billing_country", v)} placeholder="Country" />
                  </div>

                  <div className="pt-2 border-t space-y-3">
                    <p className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Finance Contact</p>
                    <div className="grid grid-cols-3 gap-3">
                      <FormField label="Name" value={form.finance_contact_name} onChange={(v) => updateField("finance_contact_name", v)} placeholder="Finance SPOC" />
                      <FormField label="Email" value={form.finance_contact_email} onChange={(v) => updateField("finance_contact_email", v)} placeholder="finance@client.com" />
                      <FormField label="Phone" value={form.finance_contact_phone} onChange={(v) => updateField("finance_contact_phone", v)} placeholder="+91 98765 43210" />
                    </div>
                  </div>

                  <div className="pt-2 border-t space-y-3">
                    <p className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Payment & Notes</p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Payment Terms" value={form.payment_terms} onChange={(v) => updateField("payment_terms", v)} placeholder="e.g. Net 30, 50% advance" />
                      <FormField label="Currency" value={form.currency} onChange={(v) => updateField("currency", v)} placeholder="INR" />
                    </div>
                    <FormArea label="PO / Invoice Notes" value={form.po_invoice_notes} onChange={(v) => updateField("po_invoice_notes", v)} placeholder="Standard invoice instructions, PO requirements" />
                    <FormArea label="Tax Notes" value={form.tax_notes} onChange={(v) => updateField("tax_notes", v)} placeholder="TDS applicability, exemptions, special tax notes" />
                  </div>
                </div>
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

      {/* Client Grid */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
            <Users className="mb-2 size-8" />
            <p className="text-sm font-medium">{EMPTY.clients.title}</p>
            <p className="mt-1 text-xs">{EMPTY.clients.description}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-4">
            {filtered.map((client) => {
              const isSelected = selected.has(client.id);
              return (
                <div key={client.id} className="relative group">
                  {/* Checkbox overlay */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelect(client.id); }}
                    className={cn(
                      "absolute left-2 top-2 z-10 rounded p-0.5 transition-opacity",
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    aria-label={isSelected ? `Deselect ${client.name}` : `Select ${client.name}`}
                  >
                    {isSelected
                      ? <CheckSquare className="size-4.5 text-primary" />
                      : <Square className="size-4.5 text-muted-foreground/50 hover:text-foreground" />
                    }
                  </button>

                  <Link href={`/clients/${client.id}`}>
                    <Card className={cn(
                      "transition-colors hover:border-primary/50 h-full",
                      isSelected && "border-primary/60 bg-primary/5"
                    )}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {client.thumbnail_url ? (
                              <img src={client.thumbnail_url} alt="" className="size-9 rounded-full object-cover border" />
                            ) : client.logo_url ? (
                              <img src={client.logo_url} alt="" className="size-9 rounded-full object-cover border" />
                            ) : (
                              <div className="flex size-9 items-center justify-center rounded-full bg-muted border border-border text-sm font-bold text-foreground shrink-0">
                                {client.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <CardTitle className="text-sm truncate">{client.name}</CardTitle>
                              {client.industry && (
                                <CardDescription className="text-[11px] truncate">{client.industry}</CardDescription>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {client.primary_email && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                              <Mail className="size-3 shrink-0" />
                              {client.primary_email}
                            </span>
                          )}
                          {client.website && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                              <Globe className="size-3 shrink-0" />
                              {client.website}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <ListChecks className="size-3" />
                            {client.task_count} tasks
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <MessageSquare className="size-3" />
                            {client.conversation_count} threads
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Reusable form components ────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold">{children}</p>;
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  required,
  autoFocus,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
        autoFocus={autoFocus}
      />
    </div>
  );
}

function FormArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-sm min-h-[60px]"
        rows={2}
      />
    </div>
  );
}

function EmptySection({ icon: Icon, text, sub }: { icon: React.ElementType; text: string; sub: string }) {
  return (
    <div className="rounded-lg border border-dashed py-8 text-center text-muted-foreground">
      <Icon className="mx-auto mb-2 size-6" />
      <p className="text-xs font-medium">{text}</p>
      <p className="mt-1 text-[10px]">{sub}</p>
    </div>
  );
}
