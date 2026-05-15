"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { IntakeForm } from "@/lib/types/clients";

interface BillingIntakeTabProps {
  form: IntakeForm;
  updateField: <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) => void;
}

export function BillingIntakeTab({ form, updateField }: BillingIntakeTabProps) {
  return (
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
