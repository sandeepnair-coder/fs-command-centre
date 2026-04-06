-- ═══════════════════════════════════════════════════════════════════════════════
-- 007: Additive billing & extended client fields
-- Safe: all columns are nullable, no existing data/logic affected
-- ═══════════════════════════════════════════════════════════════════════════════

-- Extended basic details
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city text;

-- Billing & Tax
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_legal_name text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_name text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS gst_number text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS pan text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cin text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_email text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_phone text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_address_line1 text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_address_line2 text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_city text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_state text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_postal_code text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_country text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS finance_contact_name text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS finance_contact_email text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS finance_contact_phone text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS po_invoice_notes text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tax_notes text;
