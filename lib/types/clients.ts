import type { BrandAsset } from "@/lib/types/comms";

// ─── Client stat (from getClientStats) ──────────────────────────────────────

export type ClientStat = {
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

// ─── Intake form shape ──────────────────────────────────────────────────────

export type IntakeContact = {
  name: string;
  role: string;
  email: string;
  phone: string;
  is_primary: boolean;
  is_billing: boolean;
  notes: string;
};

export type IntakeAsset = {
  file_name: string;
  storage_url: string;
  type: BrandAsset["type"];
};

export type IntakeForm = {
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

export const EMPTY_CONTACT: IntakeContact = { name: "", role: "", email: "", phone: "", is_primary: false, is_billing: false, notes: "" };
export const EMPTY_ASSET: IntakeAsset = { file_name: "", storage_url: "", type: "other" };

export function emptyForm(): IntakeForm {
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
