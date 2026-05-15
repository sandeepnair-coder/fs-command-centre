"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  User,
  FileText,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntakeForm, IntakeContact, IntakeAsset } from "@/lib/types/clients";
import { EMPTY_CONTACT, EMPTY_ASSET } from "@/lib/types/clients";
import type { BrandAsset } from "@/lib/types/comms";

interface AdvancedIntakeTabProps {
  form: IntakeForm;
  updateField: <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) => void;
  activeSection: string;
}

export function AdvancedIntakeTab({ form, updateField, activeSection }: AdvancedIntakeTabProps) {
  // ── Contact helpers ──
  function updateContact(index: number, patch: Partial<IntakeContact>) {
    const next = [...form.contacts];
    next[index] = { ...next[index], ...patch };
    updateField("contacts", next);
  }
  function addContact() {
    updateField("contacts", [...form.contacts, { ...EMPTY_CONTACT }]);
  }
  function removeContact(index: number) {
    updateField("contacts", form.contacts.filter((_, j) => j !== index));
  }

  // ── Asset helpers ──
  function updateAsset(index: number, patch: Partial<IntakeAsset>) {
    const next = [...form.assets];
    next[index] = { ...next[index], ...patch };
    updateField("assets", next);
  }
  function addAsset() {
    updateField("assets", [...form.assets, { ...EMPTY_ASSET }]);
  }
  function removeAsset(index: number) {
    updateField("assets", form.assets.filter((_, j) => j !== index));
  }

  return (
    <>
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
              onClick={addContact}
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
                    onClick={() => removeContact(i)}
                    aria-label="Remove contact"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Name" required value={contact.name} onChange={(v) => updateContact(i, { name: v })} placeholder="Full name" />
                    <FormField label="Role / Designation" value={contact.role} onChange={(v) => updateContact(i, { role: v })} placeholder="e.g. Marketing Lead" />
                    <FormField label="Email" value={contact.email} onChange={(v) => updateContact(i, { email: v })} placeholder="email@example.com" />
                    <FormField label="Phone" value={contact.phone} onChange={(v) => updateContact(i, { phone: v })} placeholder="+91 98765 43210" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={contact.is_primary} onChange={(e) => updateContact(i, { is_primary: e.target.checked })} className="rounded" />
                      Primary Contact
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={contact.is_billing} onChange={(e) => updateContact(i, { is_billing: e.target.checked })} className="rounded" />
                      Billing / Finance
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <Input value={contact.notes} onChange={(e) => updateContact(i, { notes: e.target.value })} placeholder="Any context about this contact" className="h-8 text-sm" />
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
              onClick={addAsset}
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
                    onClick={() => removeAsset(i)}
                    aria-label="Remove asset"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Type</Label>
                      <Select value={asset.type} onValueChange={(v) => updateAsset(i, { type: v as BrandAsset["type"] })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["brand_kit", "logo", "font", "guideline", "deck", "brief", "other"] as const).map((t) => (
                            <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormField label="File Name" value={asset.file_name} onChange={(v) => updateAsset(i, { file_name: v })} placeholder="e.g. BrandKit_v2.pdf" />
                    <FormField label="URL / Link" value={asset.storage_url} onChange={(v) => updateAsset(i, { storage_url: v })} placeholder="https://drive.google.com/..." />
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
    </>
  );
}

// ─── Reusable form components ───────────────────────────────────────────────

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
