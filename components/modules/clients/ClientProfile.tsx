"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Globe,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  Plus,
  Trash2,
  Check,
  X,
  Pencil,
  FileText,
  Brain,
  Activity,
  Palette,
  ShieldCheck,
  Receipt,
  CreditCard,
  Download,
  ImageIcon,
  ExternalLink,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  updateClient,
  deleteClient,
  getClientById,
  getClientContacts,
  createClientContact,
  deleteClientContact,
  getClientFacts,
  upsertClientFact,
  acceptClientFact,
  rejectClientFact,
  getBrandAssets,
  createBrandAsset,
  deleteBrandAsset,
  getWorkStreams,
} from "@/app/(app)/clients/actions";
import { getOutputsByClient } from "@/app/(app)/tasks/actions";
import { getAuditLog } from "@/app/(app)/comms/actions";
import type { Client, ClientContact, ClientFact, BrandAsset, WorkStream, AuditLogEvent } from "@/lib/types/comms";
import { VERIFICATION_CONFIG } from "@/lib/types/comms";
import { toast } from "sonner";
import { SUCCESS } from "@/lib/copy";
import { format } from "date-fns";

export function ClientProfile({ client: initial }: { client: Client }) {
  const router = useRouter();
  const [client, setClient] = useState(initial);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [facts, setFacts] = useState<ClientFact[]>([]);
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [streams, setStreams] = useState<WorkStream[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEvent[]>([]);

  // Editing
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(client);

  // New contact dialog
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", role: "", email: "", phone: "" });

  // New fact dialog
  const [factDialogOpen, setFactDialogOpen] = useState(false);
  const [newFact, setNewFact] = useState({ key: "", value: "" });

  // Brand field dialog
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [brandField, setBrandField] = useState({ key: "", value: "" });

  // Asset dialog
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({ file_name: "", storage_url: "", type: "other" as BrandAsset["type"] });

  // Intelligence enrichment
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    Promise.all([
      getClientContacts(client.id).catch(() => []),
      getClientFacts(client.id).catch(() => []),
      getBrandAssets(client.id).catch(() => []),
      getWorkStreams(client.id).catch(() => []),
      getAuditLog({ entity_type: "client", entity_id: client.id, limit: 30 }).catch(() => []),
    ]).then(([c, f, a, s, l]) => {
      setContacts(c);
      setFacts(f);
      setAssets(a);
      setStreams(s);
      setAuditLog(l);
    });
  }, [client.id]);

  async function handleSave() {
    try {
      const updated = await updateClient(client.id, {
        name: editForm.name,
        company_name: editForm.company_name,
        display_name: editForm.display_name,
        primary_email: editForm.primary_email,
        website: editForm.website,
        phone: editForm.phone,
        timezone: editForm.timezone,
        industry: editForm.industry,
        business_type: editForm.business_type,
        country: editForm.country,
        state: editForm.state,
        city: editForm.city,
        billing_legal_name: editForm.billing_legal_name,
        billing_name: editForm.billing_name,
        gst_number: editForm.gst_number,
        pan: editForm.pan,
        cin: editForm.cin,
        billing_email: editForm.billing_email,
        billing_phone: editForm.billing_phone,
        billing_address_line1: editForm.billing_address_line1,
        billing_address_line2: editForm.billing_address_line2,
        billing_city: editForm.billing_city,
        billing_state: editForm.billing_state,
        billing_postal_code: editForm.billing_postal_code,
        billing_country: editForm.billing_country,
        finance_contact_name: editForm.finance_contact_name,
        finance_contact_email: editForm.finance_contact_email,
        finance_contact_phone: editForm.finance_contact_phone,
        payment_terms: editForm.payment_terms,
        currency: editForm.currency,
        po_invoice_notes: editForm.po_invoice_notes,
        tax_notes: editForm.tax_notes,
      });
      setClient(updated);
      setEditing(false);
      toast.success(SUCCESS.clientUpdated);
    } catch {
      toast.error("Couldn't save. Try again?");
    }
  }

  async function handleDelete() {
    try {
      await deleteClient(client.id);
      toast.success(SUCCESS.clientDeleted);
      router.push("/clients");
    } catch {
      toast.error("Couldn't delete. Try again?");
    }
  }

  async function handleRunIntelligence() {
    setEnriching(true);
    try {
      const res = await fetch("/api/clients/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.id, name: client.name, email: client.primary_email, website: client.website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrichment failed");

      const total = (data.fields_updated?.length || 0) + (data.facts_written || 0);
      if (total > 0) {
        toast.success(`Intelligence complete — ${total} fields enriched`);
        const [updatedFacts, refreshedClient] = await Promise.all([
          getClientFacts(client.id).catch(() => []),
          getClientById(client.id).catch(() => null),
        ]);
        setFacts(updatedFacts as ClientFact[]);
        if (refreshedClient) setClient(refreshedClient as Client);
      } else {
        toast.info("No new intelligence found — this client is already well-documented");
      }
    } catch (e) {
      toast.error((e as Error).message || "Intelligence run failed");
    } finally {
      setEnriching(false);
    }
  }

  function handleDownloadMd() {
    const lines: string[] = [];
    const ln = (s = "") => lines.push(s);
    const field = (label: string, val: string | null | undefined) => {
      if (val) ln(`- **${label}:** ${val}`);
    };

    ln(`# ${client.name}`);
    ln();
    ln(`> Generated ${format(new Date(), "d MMM yyyy, h:mm a")}`);
    ln();

    // Overview
    ln(`## Overview`);
    ln();
    field("Company", client.company_name);
    field("Display Name", client.display_name);
    field("Email", client.primary_email);
    field("Website", client.website);
    field("Phone", client.phone);
    field("Industry", client.industry);
    field("Business Type", client.business_type);
    field("Timezone", client.timezone);
    if (client.city || client.state || client.country) {
      field("Location", [client.city, client.state, client.country].filter(Boolean).join(", "));
    }
    ln();

    // Contacts
    if (contacts.length > 0) {
      ln(`## Contacts`);
      ln();
      contacts.forEach((c) => {
        ln(`### ${c.name}`);
        field("Role", c.role);
        field("Email", c.email);
        field("Phone", c.phone);
        if (c.notes) field("Notes", c.notes);
        ln();
      });
    }

    // Brand & Web
    const brandKeys = ["website", "instagram", "linkedin", "facebook", "twitter", "youtube", "target_audience", "tone_voice", "positioning", "brand_color_primary", "brand_color_secondary", "tagline"];
    const brandFacts = facts.filter((f) => brandKeys.includes(f.key));
    if (brandFacts.length > 0) {
      ln(`## Brand & Web`);
      ln();
      brandFacts.forEach((f) => {
        field(f.key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), f.value);
      });
      ln();
    }

    // Assets
    if (assets.length > 0) {
      ln(`## Assets`);
      ln();
      assets.forEach((a) => {
        ln(`- **${a.file_name}** (${a.type.replace("_", " ")})${a.storage_url ? ` — ${a.storage_url}` : ""}`);
      });
      ln();
    }

    // Intelligence
    const intelFacts = facts.filter((f) => !brandKeys.includes(f.key));
    if (intelFacts.length > 0) {
      ln(`## Intelligence`);
      ln();
      intelFacts.forEach((f) => {
        const status = f.verification_status !== "verified" ? ` _(${f.verification_status})_` : "";
        field(f.key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), f.value + status);
      });
      ln();
    }

    // Billing & Tax
    if (client.billing_legal_name || client.gst_number || client.pan || client.billing_email) {
      ln(`## Billing & Tax`);
      ln();
      field("Legal Entity Name", client.billing_legal_name);
      field("Billing Name", client.billing_name);
      field("GST / Tax ID", client.gst_number);
      field("PAN", client.pan);
      field("CIN", client.cin);
      field("Billing Email", client.billing_email);
      field("Billing Phone", client.billing_phone);
      if (client.billing_address_line1) {
        ln();
        ln(`**Billing Address:**`);
        if (client.billing_address_line1) ln(client.billing_address_line1);
        if (client.billing_address_line2) ln(client.billing_address_line2);
        const cityLine = [client.billing_city, client.billing_state, client.billing_postal_code].filter(Boolean).join(", ");
        if (cityLine) ln(cityLine);
        if (client.billing_country) ln(client.billing_country);
      }
      ln();
      field("Finance Contact", client.finance_contact_name);
      field("Finance Email", client.finance_contact_email);
      field("Finance Phone", client.finance_contact_phone);
      field("Payment Terms", client.payment_terms);
      field("Currency", client.currency);
      if (client.po_invoice_notes) {
        ln();
        ln(`**PO / Invoice Notes:**`);
        ln(client.po_invoice_notes);
      }
      if (client.tax_notes) {
        ln();
        ln(`**Tax Notes:**`);
        ln(client.tax_notes);
      }
      ln();
    }

    // Work Streams
    if (streams.length > 0) {
      ln(`## Work Streams`);
      ln();
      streams.forEach((s) => {
        ln(`- ${s.name}${s.summary ? ` — ${s.summary}` : ""}`);
      });
      ln();
    }

    ln(`---`);
    ln(`_Exported from Fynd Studio Command Centre_`);

    const md = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-").toLowerCase()}-client-card.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Client card downloaded");
  }

  async function handleAddContact() {
    if (!newContact.name.trim()) return;
    try {
      const c = await createClientContact({
        client_id: client.id,
        name: newContact.name.trim(),
        role: newContact.role.trim() || undefined,
        email: newContact.email.trim() || undefined,
        phone: newContact.phone.trim() || undefined,
      });
      setContacts((prev) => [...prev, c]);
      setContactDialogOpen(false);
      setNewContact({ name: "", role: "", email: "", phone: "" });
      toast.success(SUCCESS.contactAdded);
    } catch {
      toast.error("Couldn't add contact. Try again?");
    }
  }

  async function handleAddFact() {
    if (!newFact.key.trim() || !newFact.value.trim()) return;
    try {
      const f = await upsertClientFact({
        client_id: client.id,
        key: newFact.key.trim(),
        value: newFact.value.trim(),
        verification_status: "verified",
      });
      setFacts((prev) => [...prev.filter((x) => x.key !== f.key), f]);
      setFactDialogOpen(false);
      setNewFact({ key: "", value: "" });
      toast.success(SUCCESS.saved);
    } catch {
      toast.error("Couldn't save fact. Try again?");
    }
  }

  async function handleAddBrandField() {
    if (!brandField.key.trim() || !brandField.value.trim()) return;
    try {
      const f = await upsertClientFact({
        client_id: client.id,
        key: brandField.key.trim(),
        value: brandField.value.trim(),
        verification_status: "verified",
      });
      setFacts((prev) => [...prev.filter((x) => x.key !== f.key), f]);
      setBrandDialogOpen(false);
      setBrandField({ key: "", value: "" });
      toast.success(SUCCESS.saved);
    } catch {
      toast.error("Couldn't save. Try again?");
    }
  }

  async function handleAddAsset() {
    if (!newAsset.file_name.trim() || !newAsset.storage_url.trim()) return;
    try {
      const a = await createBrandAsset({
        client_id: client.id,
        type: newAsset.type,
        file_name: newAsset.file_name.trim(),
        storage_url: newAsset.storage_url.trim(),
      });
      setAssets((prev) => [a, ...prev]);
      setAssetDialogOpen(false);
      setNewAsset({ file_name: "", storage_url: "", type: "other" });
      toast.success(SUCCESS.saved);
    } catch {
      toast.error("Couldn't add asset. Try again?");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <button onClick={() => router.push("/clients")} className="mb-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-3" /> Back to Clients
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {client.logo_url ? (
              <img src={client.logo_url} alt="" className="size-12 rounded-xl object-cover border" />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                {client.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate text-balance">{client.name}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {client.website && (
                  <span className="flex items-center gap-1">
                    <Globe className="size-3" /> {client.website}
                  </span>
                )}
                {client.primary_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="size-3" /> {client.primary_email}
                  </span>
                )}
                {client.industry && (
                  <Badge variant="secondary" className="text-[10px]">{client.industry}</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleRunIntelligence}
              disabled={enriching}
            >
              {enriching ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Sparkles className="mr-1 size-3" />}
              {enriching ? "Running…" : "Run Intelligence"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleDownloadMd}
            >
              <Download className="mr-1 size-3" /> Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setEditForm(client); setEditing(true); }}
            >
              <Pencil className="mr-1 size-3" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive">
                  <Trash2 className="mr-1 size-3" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {client.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the client, all contacts, facts, and brand assets. Tasks will keep their data but lose the client link.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Client
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Basic Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-sm">Name</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <EditField label="Company" value={editForm.company_name} onChange={(v) => setEditForm((p) => ({ ...p, company_name: v }))} />
              <EditField label="Display Name" value={editForm.display_name} onChange={(v) => setEditForm((p) => ({ ...p, display_name: v }))} />
              <EditField label="Industry" value={editForm.industry} onChange={(v) => setEditForm((p) => ({ ...p, industry: v }))} />
              <EditField label="Business Type" value={editForm.business_type} onChange={(v) => setEditForm((p) => ({ ...p, business_type: v }))} placeholder="e.g. Pvt Ltd, LLP" />
              <EditField label="Email" value={editForm.primary_email} onChange={(v) => setEditForm((p) => ({ ...p, primary_email: v }))} />
              <EditField label="Phone" value={editForm.phone} onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))} />
              <EditField label="Website" value={editForm.website} onChange={(v) => setEditForm((p) => ({ ...p, website: v }))} />
              <EditField label="Timezone" value={editForm.timezone} onChange={(v) => setEditForm((p) => ({ ...p, timezone: v }))} placeholder="e.g. IST, EST" />
              <EditField label="Country" value={editForm.country} onChange={(v) => setEditForm((p) => ({ ...p, country: v }))} />
              <EditField label="State" value={editForm.state} onChange={(v) => setEditForm((p) => ({ ...p, state: v }))} />
              <EditField label="City" value={editForm.city} onChange={(v) => setEditForm((p) => ({ ...p, city: v }))} />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50 pt-2">Billing & Tax</p>
            <div className="grid grid-cols-2 gap-3">
              <EditField label="Legal Entity Name" value={editForm.billing_legal_name} onChange={(v) => setEditForm((p) => ({ ...p, billing_legal_name: v }))} />
              <EditField label="Billing Name" value={editForm.billing_name} onChange={(v) => setEditForm((p) => ({ ...p, billing_name: v }))} />
              <EditField label="GST / Tax ID" value={editForm.gst_number} onChange={(v) => setEditForm((p) => ({ ...p, gst_number: v }))} />
              <EditField label="PAN" value={editForm.pan} onChange={(v) => setEditForm((p) => ({ ...p, pan: v }))} />
              <EditField label="CIN" value={editForm.cin} onChange={(v) => setEditForm((p) => ({ ...p, cin: v }))} />
              <EditField label="Billing Email" value={editForm.billing_email} onChange={(v) => setEditForm((p) => ({ ...p, billing_email: v }))} />
              <EditField label="Billing Phone" value={editForm.billing_phone} onChange={(v) => setEditForm((p) => ({ ...p, billing_phone: v }))} />
              <div />
              <EditField label="Address Line 1" value={editForm.billing_address_line1} onChange={(v) => setEditForm((p) => ({ ...p, billing_address_line1: v }))} className="col-span-2" />
              <EditField label="Address Line 2" value={editForm.billing_address_line2} onChange={(v) => setEditForm((p) => ({ ...p, billing_address_line2: v }))} className="col-span-2" />
              <EditField label="City" value={editForm.billing_city} onChange={(v) => setEditForm((p) => ({ ...p, billing_city: v }))} />
              <EditField label="State" value={editForm.billing_state} onChange={(v) => setEditForm((p) => ({ ...p, billing_state: v }))} />
              <EditField label="Postal Code" value={editForm.billing_postal_code} onChange={(v) => setEditForm((p) => ({ ...p, billing_postal_code: v }))} />
              <EditField label="Country" value={editForm.billing_country} onChange={(v) => setEditForm((p) => ({ ...p, billing_country: v }))} />
              <EditField label="Finance Contact" value={editForm.finance_contact_name} onChange={(v) => setEditForm((p) => ({ ...p, finance_contact_name: v }))} />
              <EditField label="Finance Email" value={editForm.finance_contact_email} onChange={(v) => setEditForm((p) => ({ ...p, finance_contact_email: v }))} />
              <EditField label="Finance Phone" value={editForm.finance_contact_phone} onChange={(v) => setEditForm((p) => ({ ...p, finance_contact_phone: v }))} />
              <EditField label="Payment Terms" value={editForm.payment_terms} onChange={(v) => setEditForm((p) => ({ ...p, payment_terms: v }))} placeholder="e.g. Net 30" />
              <EditField label="Currency" value={editForm.currency} onChange={(v) => setEditForm((p) => ({ ...p, currency: v }))} placeholder="INR" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="shrink-0 mb-4">
          <TabsTrigger value="overview" className="gap-1 text-xs"><Building2 className="size-3" /> Overview</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1 text-xs"><User className="size-3" /> Contacts</TabsTrigger>
          <TabsTrigger value="brand" className="gap-1 text-xs"><Palette className="size-3" /> Brand & Web</TabsTrigger>
          <TabsTrigger value="assets" className="gap-1 text-xs"><FileText className="size-3" /> Assets</TabsTrigger>
          <TabsTrigger value="outputs" className="gap-1 text-xs"><ImageIcon className="size-3" /> Final Outputs</TabsTrigger>
          <TabsTrigger value="intelligence" className="gap-1 text-xs"><Brain className="size-3" /> Intelligence</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1 text-xs"><Activity className="size-3" /> Activity Log</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1 text-xs"><Receipt className="size-3" /> Billing & Tax</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-hidden">
          {/* ─── Overview ─── */}
          <TabsContent value="overview" className="h-full mt-0">
            <ScrollArea className="h-full">
              <div className="grid gap-4 sm:grid-cols-2 pb-4">
                <InfoCard icon={Building2} label="Company" value={client.company_name} />
                <InfoCard icon={Globe} label="Website" value={client.website} />
                <InfoCard icon={Mail} label="Email" value={client.primary_email} />
                <InfoCard icon={Phone} label="Phone" value={client.phone} />
                <InfoCard icon={MapPin} label="Timezone" value={client.timezone} />
                <InfoCard icon={ShieldCheck} label="Industry" value={client.industry} />
                {client.business_type && <InfoCard icon={Building2} label="Business Type" value={client.business_type} />}
                {(client.city || client.state || client.country) && (
                  <InfoCard icon={MapPin} label="Location" value={[client.city, client.state, client.country].filter(Boolean).join(", ")} />
                )}

                {/* Work Streams */}
                <div className="col-span-2 rounded-xl border bg-card p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-3">Work Streams</p>
                  {streams.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 italic">No work streams yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {streams.map((s) => (
                        <Badge key={s.id} variant="outline" className="text-xs">{s.name}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Contacts ─── */}
          <TabsContent value="contacts" className="h-full mt-0">
            <ScrollArea className="h-full">
              <div className="space-y-3 pb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</p>
                  <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <Plus className="mr-1 size-3" /> Add Contact
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader><DialogTitle>New Contact</DialogTitle></DialogHeader>
                      <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Name <span className="text-destructive">*</span></Label>
                          <Input value={newContact.name} onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))} autoFocus />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Role</Label>
                          <Input value={newContact.role} onChange={(e) => setNewContact((p) => ({ ...p, role: e.target.value }))} placeholder="e.g. SPOC, Marketing Lead" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Email</Label>
                            <Input value={newContact.email} onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Phone</Label>
                            <Input value={newContact.phone} onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))} />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
                        <Button size="sm" onClick={handleAddContact} disabled={!newContact.name.trim()}>Add</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {contacts.map((c) => (
                  <div key={c.id} className="rounded-xl border bg-card p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{c.name}</p>
                        <Badge variant="secondary" className={cn("text-[10px]", VERIFICATION_CONFIG[c.verification_status].color)}>
                          {VERIFICATION_CONFIG[c.verification_status].label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {c.role && <span>{c.role}</span>}
                        {c.email && <span className="flex items-center gap-1"><Mail className="size-3" />{c.email}</span>}
                        {c.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{c.phone}</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={async () => {
                        try { await deleteClientContact(c.id); setContacts((prev) => prev.filter((x) => x.id !== c.id)); }
                        catch { toast.error("Couldn't remove contact."); }
                      }}
                      aria-label="Delete contact"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Brand & Web ─── */}
          <TabsContent value="brand" className="h-full mt-0">
            <ScrollArea className="h-full">
              <div className="space-y-3 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Brand & Digital Presence</p>
                    <p className="text-xs text-muted-foreground text-pretty">Social handles, target audience, tone, and positioning.</p>
                  </div>
                  <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <Plus className="mr-1 size-3" /> Add Field
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader><DialogTitle>Add Brand Field</DialogTitle></DialogHeader>
                      <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Field</Label>
                          <Select value={brandField.key} onValueChange={(v) => setBrandField((p) => ({ ...p, key: v }))}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select field" /></SelectTrigger>
                            <SelectContent position="popper" sideOffset={4}>
                              {["instagram", "linkedin", "facebook", "twitter", "youtube", "website", "target_audience", "tone_voice", "positioning", "brand_color_primary", "brand_color_secondary", "tagline"].map((k) => (
                                <SelectItem key={k} value={k}>{k.replace(/_/g, " ")}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Value</Label>
                          <Input value={brandField.value} onChange={(e) => setBrandField((p) => ({ ...p, value: e.target.value }))} placeholder="e.g. @greenleaf_organic" />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
                        <Button size="sm" onClick={handleAddBrandField} disabled={!brandField.key || !brandField.value.trim()}>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {(() => {
                  const brandKeys = ["website", "instagram", "linkedin", "facebook", "twitter", "youtube", "target_audience", "tone_voice", "positioning", "brand_color_primary", "brand_color_secondary", "tagline"];
                  const brandFacts = facts.filter((f) => brandKeys.includes(f.key));
                  if (brandFacts.length === 0) {
                    return (
                      <div className="rounded-xl border border-dashed py-8 text-center text-muted-foreground">
                        <Palette className="mx-auto mb-2 size-6" />
                        <p className="text-xs">No brand details yet.</p>
                        <p className="mt-1 text-[10px]">Click "Add Field" above to add social handles, tone, audience, and more.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {brandFacts.map((f) => (
                        <FactCard key={f.id} fact={f} onAccept={async () => { const u = await acceptClientFact(f.id); setFacts((p) => p.map((x) => x.id === f.id ? u : x)); toast.success(SUCCESS.factAccepted); }} onReject={async () => { await rejectClientFact(f.id); setFacts((p) => p.filter((x) => x.id !== f.id)); toast.success(SUCCESS.factRejected); }} />
                      ))}
                    </div>
                  );
                })()}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Assets ─── */}
          <TabsContent value="assets" className="h-full mt-0">
            <ScrollArea className="h-full">
              <div className="space-y-3 pb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Brand Assets ({assets.length})</p>
                  <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <Plus className="mr-1 size-3" /> Add Asset
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader><DialogTitle>Add Brand Asset</DialogTitle></DialogHeader>
                      <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Type</Label>
                          <Select value={newAsset.type} onValueChange={(v) => setNewAsset((p) => ({ ...p, type: v as BrandAsset["type"] }))}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent position="popper" sideOffset={4}>
                              {(["brand_kit", "logo", "font", "guideline", "deck", "brief", "other"] as const).map((t) => (
                                <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">File Name <span className="text-destructive">*</span></Label>
                          <Input value={newAsset.file_name} onChange={(e) => setNewAsset((p) => ({ ...p, file_name: e.target.value }))} placeholder="e.g. GreenLeaf_BrandKit_v2.pdf" autoFocus />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">URL / Link <span className="text-destructive">*</span></Label>
                          <Input value={newAsset.storage_url} onChange={(e) => setNewAsset((p) => ({ ...p, storage_url: e.target.value }))} placeholder="https://drive.google.com/..." />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
                        <Button size="sm" onClick={handleAddAsset} disabled={!newAsset.file_name.trim() || !newAsset.storage_url.trim()}>Add Asset</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {assets.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-8 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 size-6" />
                    <p className="text-xs">No assets added yet.</p>
                    <p className="mt-1 text-[10px]">Add brand kits, logos, guidelines, and decks using the button above.</p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {assets.map((a) => (
                      <div key={a.id} className="rounded-xl border bg-card p-3 group">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-[10px]">{a.type.replace("_", " ")}</Badge>
                          <Button
                            variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={async () => { try { await deleteBrandAsset(a.id); setAssets((prev) => prev.filter((x) => x.id !== a.id)); } catch { toast.error("Couldn't remove asset."); } }}
                            aria-label="Delete asset"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                        <p className="text-sm font-medium truncate">{a.file_name}</p>
                        {a.storage_url && (
                          <a href={a.storage_url} target="_blank" rel="noopener noreferrer" className="mt-1 text-[10px] text-primary hover:underline truncate block">
                            Open link
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Intelligence ─── */}
          <TabsContent value="intelligence" className="h-full mt-0">
            <ScrollArea className="h-full">
              <div className="space-y-3 pb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Client Facts ({facts.length})</p>
                  <Dialog open={factDialogOpen} onOpenChange={setFactDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <Plus className="mr-1 size-3" /> Add Fact
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader><DialogTitle>New Client Fact</DialogTitle></DialogHeader>
                      <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Key</Label>
                          <Input value={newFact.key} onChange={(e) => setNewFact((p) => ({ ...p, key: e.target.value }))} placeholder="e.g. instagram, primary_spoc, tone_voice" autoFocus />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Value</Label>
                          <Input value={newFact.value} onChange={(e) => setNewFact((p) => ({ ...p, value: e.target.value }))} placeholder="e.g. @greenleaf_official" />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
                        <Button size="sm" onClick={handleAddFact} disabled={!newFact.key.trim() || !newFact.value.trim()}>Save Fact</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {facts.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-8 text-center text-muted-foreground">
                    <Brain className="mx-auto mb-2 size-6" />
                    <p className="text-xs">No intelligence yet.</p>
                    <p className="mt-1 text-[10px]">Facts will be stored here — both manual and AI-inferred (once connectors are enabled).</p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {facts.map((f) => (
                      <FactCard
                        key={f.id}
                        fact={f}
                        onAccept={async () => { const u = await acceptClientFact(f.id); setFacts((p) => p.map((x) => x.id === f.id ? u : x)); toast.success(SUCCESS.factAccepted); }}
                        onReject={async () => { await rejectClientFact(f.id); setFacts((p) => p.filter((x) => x.id !== f.id)); toast.success(SUCCESS.factRejected); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Final Outputs ─── */}
          <TabsContent value="outputs" className="h-full mt-0">
            <ScrollArea className="h-full">
              <div className="space-y-3 pb-4">
                <p className="text-sm font-medium">Final Outputs</p>
                <p className="text-xs text-muted-foreground">Output links and deliverables from task cards linked to this client.</p>
                <ClientOutputsGrid clientId={client.id} />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Activity Log ─── */}
          <TabsContent value="activity" className="h-full mt-0">
            <ScrollArea className="h-full">
              <div className="space-y-2 pb-4">
                <p className="text-sm font-medium">Activity Log</p>
                {auditLog.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic">No activity recorded yet.</p>
                ) : (
                  auditLog.map((e) => (
                    <div key={e.id} className="flex items-start gap-2 rounded-lg border bg-card p-2.5">
                      <Activity className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">{e.event_type.replace(/_/g, " ")}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {format(new Date(e.created_at), "d MMM yyyy, h:mm a")} · {e.actor_type}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Billing & Tax ─── */}
          <TabsContent value="billing" className="h-full mt-0">
            <ScrollArea className="h-full">
              <div className="space-y-4 pb-4">
                <p className="text-sm font-medium">Billing & Tax Details</p>

                {/* Tax Registration */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Tax Registration</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoCard icon={Building2} label="Legal Entity Name" value={client.billing_legal_name} />
                    <InfoCard icon={CreditCard} label="Billing Name" value={client.billing_name} />
                    <InfoCard icon={Receipt} label="GST / VAT / Tax ID" value={client.gst_number} />
                    <InfoCard icon={ShieldCheck} label="PAN" value={client.pan} />
                    <InfoCard icon={FileText} label="CIN / Registration No." value={client.cin} />
                  </div>
                </div>

                {/* Billing Address */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Billing Address</p>
                  <div className="rounded-xl border bg-card p-3">
                    {client.billing_address_line1 || client.billing_city ? (
                      <div className="text-sm space-y-0.5">
                        {client.billing_address_line1 && <p>{client.billing_address_line1}</p>}
                        {client.billing_address_line2 && <p>{client.billing_address_line2}</p>}
                        <p className="text-muted-foreground">
                          {[client.billing_city, client.billing_state, client.billing_postal_code].filter(Boolean).join(", ")}
                        </p>
                        {client.billing_country && <p className="text-muted-foreground">{client.billing_country}</p>}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 italic">Not set</p>
                    )}
                  </div>
                </div>

                {/* Billing Contact */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Billing Contact</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoCard icon={Mail} label="Billing Email" value={client.billing_email} />
                    <InfoCard icon={Phone} label="Billing Phone" value={client.billing_phone} />
                  </div>
                </div>

                {/* Finance Contact */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Finance Contact</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <InfoCard icon={User} label="Name" value={client.finance_contact_name} />
                    <InfoCard icon={Mail} label="Email" value={client.finance_contact_email} />
                    <InfoCard icon={Phone} label="Phone" value={client.finance_contact_phone} />
                  </div>
                </div>

                {/* Payment */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Payment & Notes</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoCard icon={CreditCard} label="Payment Terms" value={client.payment_terms} />
                    <InfoCard icon={Receipt} label="Currency" value={client.currency} />
                  </div>
                  {(client.po_invoice_notes || client.tax_notes) && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {client.po_invoice_notes && (
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-[11px] font-medium text-foreground/50 mb-1">PO / Invoice Notes</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{client.po_invoice_notes}</p>
                        </div>
                      )}
                      {client.tax_notes && (
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-[11px] font-medium text-foreground/50 mb-1">Tax Notes</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{client.tax_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[11px] font-medium text-foreground/50 flex items-center gap-1.5 mb-1">
        <Icon className="size-3" /> {label}
      </p>
      <p className={cn("text-sm", value ? "text-foreground" : "text-muted-foreground/50 italic")}>
        {value || "Not set"}
      </p>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm">{label}</Label>
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={placeholder}
        className="h-8"
      />
    </div>
  );
}

function FactCard({
  fact,
  onAccept,
  onReject,
}: {
  fact: ClientFact;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-foreground/50">{fact.key.replace(/_/g, " ")}</p>
        <Badge variant="secondary" className={cn("text-[10px]", VERIFICATION_CONFIG[fact.verification_status].color)}>
          {VERIFICATION_CONFIG[fact.verification_status].label}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-foreground truncate">{fact.value}</p>
      {fact.confidence && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">Confidence: {fact.confidence}</p>
      )}
      {fact.verification_status === "inferred" && (
        <div className="mt-2 flex gap-1.5">
          <Button variant="outline" size="sm" className="h-6 text-[10px] text-emerald-600" onClick={onAccept}>
            <Check className="mr-0.5 size-3" /> Accept
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-[10px] text-destructive" onClick={onReject}>
            <X className="mr-0.5 size-3" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Client Final Outputs Grid ──────────────────────────────────────────────

type ClientOutputLink = { id: string; task_id: string; url: string; label: string | null; created_at: string; task_name: string; type: "link" };
type ClientOutputUpload = { id: string; task_id: string; url: string; file_name: string; created_at: string; task_name: string; type: "upload" };

function ClientOutputsGrid({ clientId }: { clientId: string }) {
  const [links, setLinks] = useState<ClientOutputLink[]>([]);
  const [uploads, setUploads] = useState<ClientOutputUpload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOutputsByClient(clientId)
      .then((data) => { setLinks(data.links || []); setUploads(data.uploads || []); })
      .catch(() => { setLinks([]); setUploads([]); })
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}</div>;
  if (links.length === 0 && uploads.length === 0) return <p className="text-xs text-muted-foreground/60 italic">No final outputs yet. Add output links from task cards to see them here.</p>;

  const grouped: Record<string, { task_name: string; items: (ClientOutputLink | ClientOutputUpload)[] }> = {};
  for (const l of links) {
    if (!grouped[l.task_id]) grouped[l.task_id] = { task_name: l.task_name, items: [] };
    grouped[l.task_id].items.push(l);
  }
  for (const u of uploads) {
    if (!grouped[u.task_id]) grouped[u.task_id] = { task_name: u.task_name, items: [] };
    grouped[u.task_id].items.push(u);
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([taskId, group]) => (
        <div key={taskId} className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{group.task_name}</p>
          {group.items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 py-1">
              {item.type === "link" ? (
                <>
                  <ExternalLink className="h-3 w-3 shrink-0 mt-1 text-emerald-600" />
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                    {(item as ClientOutputLink).label || item.url}
                  </a>
                </>
              ) : (
                <>
                  <ImageIcon className="h-3 w-3 shrink-0 mt-1 text-emerald-600" />
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                    {(item as ClientOutputUpload).file_name}
                  </a>
                </>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
