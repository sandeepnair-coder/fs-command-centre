export type Vendor = {
  id: string;
  name: string;
  gst_number: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  bank_details: { account_number?: string; ifsc?: string; bank_name?: string } | null;
  payment_terms: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type POStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "sent"
  | "partially_received"
  | "completed"
  | "cancelled";

export type PurchaseOrder = {
  id: string;
  po_number: string;
  vendor_id: string | null;
  project_id: string | null;
  created_by: string | null;
  approved_by: string | null;
  status: POStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  payment_terms: string;
  delivery_date: string | null;
  shipping_address: string | null;
  notes: string | null;
  sent_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  vendor_name?: string;
  project_title?: string;
  line_items?: POLineItem[];
};

export type POLineItem = {
  id: string;
  po_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  discount_percent: number;
  line_total: number;
  project_id: string | null;
  created_at: string;
};

export type PaymentMethod = "cash" | "bank_transfer" | "upi" | "credit_card" | "petty_cash";

export type ExpenseStatus = "pending" | "approved" | "rejected" | "reimbursed";

export type Expense = {
  id: string;
  date: string;
  amount: number;
  category: string;
  sub_category: string | null;
  vendor_payee: string | null;
  payment_method: PaymentMethod;
  project_id: string | null;
  description: string | null;
  receipt_url: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  status: ExpenseStatus;
  approved_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  project_title?: string;
};

export type InvoiceType = "receivable" | "payable";

export type InvoiceStatus = "draft" | "sent" | "viewed" | "partially_paid" | "paid" | "overdue" | "cancelled";

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  rate: number;
  tax_percent: number;
  amount: number;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  type: InvoiceType;
  client_vendor_name: string;
  project_id: string | null;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_date: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  project_title?: string;
};

// KPI data for overview dashboard
export type FinanceKPIs = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  revenueChange: number;
  expenseChange: number;
  totalBudget?: number;
  projectCount?: number;
};

export type ProjectFinancial = {
  project_id: string;
  project_title: string;
  client_name: string | null;
  budget: number;
  spent: number;
  variance: number;
  margin_percent: number;
  status: string;
  po_count: number;
  expense_count: number;
};

export const EXPENSE_CATEGORIES = [
  "Vendor / Supplier",
  "Tools & Software",
  "Travel & Transport",
  "Operations",
  "Marketing",
  "Payroll & Contractor",
  "Taxes & Compliance",
  "Other",
] as const;

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "credit_card", label: "Credit Card" },
  { value: "petty_cash", label: "Petty Cash" },
];
