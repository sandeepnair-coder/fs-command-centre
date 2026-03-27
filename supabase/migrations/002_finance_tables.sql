-- Finance Module Schema
-- Run this in the Supabase SQL Editor to create the finance tables

-- ─── Vendors ────────────────────────────────────────────────────────────────

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gst_number text,
  contact_person text,
  email text,
  phone text,
  address text,
  bank_details jsonb, -- { account_number, ifsc, bank_name }
  payment_terms text default 'Net 30',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Purchase Orders ────────────────────────────────────────────────────────

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text unique not null,
  vendor_id uuid references vendors(id) on delete set null,
  project_id uuid references tasks(id) on delete set null,
  created_by uuid,
  approved_by text,
  status text not null default 'draft'
    check (status in ('draft','pending_approval','approved','sent','partially_received','completed','cancelled')),
  subtotal numeric(12,2) default 0,
  tax_amount numeric(12,2) default 0,
  discount_amount numeric(12,2) default 0,
  total_amount numeric(12,2) default 0,
  currency text default 'INR',
  payment_terms text default 'Net 30',
  delivery_date date,
  shipping_address text,
  notes text,
  sent_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── PO Line Items ──────────────────────────────────────────────────────────

create table if not exists po_line_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid references purchase_orders(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  tax_percent numeric(5,2) default 18,
  discount_percent numeric(5,2) default 0,
  line_total numeric(12,2) default 0,
  project_id uuid references tasks(id) on delete set null,
  created_at timestamptz default now()
);

-- ─── Expenses ───────────────────────────────────────────────────────────────

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  amount numeric(12,2) not null,
  category text not null,
  sub_category text,
  vendor_payee text,
  payment_method text default 'bank_transfer'
    check (payment_method in ('cash','bank_transfer','upi','credit_card','petty_cash')),
  project_id uuid references tasks(id) on delete set null,
  description text,
  receipt_url text,
  is_recurring boolean default false,
  recurrence_rule text,
  status text default 'approved'
    check (status in ('pending','approved','rejected','reimbursed')),
  approved_by text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Invoices ───────────────────────────────────────────────────────────────

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  type text not null check (type in ('receivable','payable')),
  client_vendor_name text not null,
  project_id uuid references tasks(id) on delete set null,
  line_items jsonb default '[]',
  subtotal numeric(12,2) default 0,
  tax_amount numeric(12,2) default 0,
  total_amount numeric(12,2) default 0,
  status text default 'draft'
    check (status in ('draft','sent','viewed','partially_paid','paid','overdue','cancelled')),
  due_date date,
  paid_date date,
  payment_reference text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Financial Transactions (Ledger) ────────────────────────────────────────

create table if not exists financial_transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  type text not null check (type in ('income','expense')),
  amount numeric(12,2) not null,
  category text,
  reference_type text, -- 'po', 'expense', 'invoice'
  reference_id uuid,
  project_id uuid references tasks(id) on delete set null,
  description text,
  created_at timestamptz default now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

create index if not exists idx_po_vendor on purchase_orders(vendor_id);
create index if not exists idx_po_project on purchase_orders(project_id);
create index if not exists idx_po_status on purchase_orders(status);
create index if not exists idx_expenses_project on expenses(project_id);
create index if not exists idx_expenses_category on expenses(category);
create index if not exists idx_expenses_date on expenses(date);
create index if not exists idx_invoices_project on invoices(project_id);
create index if not exists idx_invoices_status on invoices(status);
create index if not exists idx_invoices_type on invoices(type);
create index if not exists idx_ft_project on financial_transactions(project_id);
create index if not exists idx_ft_date on financial_transactions(date);

-- ─── RLS Policies ───────────────────────────────────────────────────────────

alter table vendors enable row level security;
alter table purchase_orders enable row level security;
alter table po_line_items enable row level security;
alter table expenses enable row level security;
alter table invoices enable row level security;
alter table financial_transactions enable row level security;

-- Allow authenticated users full access (adjust per your needs)
create policy "Authenticated users can manage vendors" on vendors for all using (auth.role() = 'authenticated');
create policy "Authenticated users can manage purchase_orders" on purchase_orders for all using (auth.role() = 'authenticated');
create policy "Authenticated users can manage po_line_items" on po_line_items for all using (auth.role() = 'authenticated');
create policy "Authenticated users can manage expenses" on expenses for all using (auth.role() = 'authenticated');
create policy "Authenticated users can manage invoices" on invoices for all using (auth.role() = 'authenticated');
create policy "Authenticated users can manage financial_transactions" on financial_transactions for all using (auth.role() = 'authenticated');

-- ─── Helper: Auto PO Number ─────────────────────────────────────────────────

create or replace function generate_po_number() returns text as $$
declare
  prefix text;
  seq int;
begin
  prefix := 'PO-' || to_char(now(), 'YYYYMM') || '-';
  select coalesce(max(cast(substring(po_number from length(prefix)+1) as int)), 0) + 1
    into seq
    from purchase_orders
    where po_number like prefix || '%';
  return prefix || lpad(seq::text, 3, '0');
end;
$$ language plpgsql;

-- ─── Helper: Auto Invoice Number ────────────────────────────────────────────

create or replace function generate_invoice_number() returns text as $$
declare
  prefix text;
  seq int;
begin
  prefix := 'INV-' || to_char(now(), 'YYYYMM') || '-';
  select coalesce(max(cast(substring(invoice_number from length(prefix)+1) as int)), 0) + 1
    into seq
    from invoices
    where invoice_number like prefix || '%';
  return prefix || lpad(seq::text, 3, '0');
end;
$$ language plpgsql;
