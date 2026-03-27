"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Search, Trash2 } from "lucide-react";
import { getInvoices, createInvoice, updateInvoiceStatus, getActiveProjects } from "../actions";
import type { Invoice, InvoiceLineItem } from "@/lib/types/finance";
import { formatINR, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SUCCESS } from "@/lib/copy";
import { differenceInDays, startOfDay } from "date-fns";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  viewed: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  partially_paid: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string; cost: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<"receivable" | "payable">("receivable");
  const [formClientVendor, setFormClientVendor] = useState("");
  const [formProjectId, setFormProjectId] = useState("__none__");
  const [formDueDate, setFormDueDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<InvoiceLineItem[]>([
    { description: "", quantity: 1, rate: 0, tax_percent: 18, amount: 0 },
  ]);
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (filterType !== "all") filters.type = filterType;
      if (filterStatus !== "all") filters.status = filterStatus;
      const [inv, proj] = await Promise.all([
        getInvoices(Object.keys(filters).length > 0 ? filters : undefined),
        getActiveProjects(),
      ]);
      setInvoices(inv);
      setProjects(proj);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  function updateItem(idx: number, field: keyof InvoiceLineItem, value: string | number) {
    setFormItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        updated.amount = updated.quantity * updated.rate * (1 + updated.tax_percent / 100);
        return updated;
      })
    );
  }

  const subtotal = formItems.reduce((s, i) => s + i.quantity * i.rate, 0);
  const taxTotal = formItems.reduce((s, i) => s + i.quantity * i.rate * (i.tax_percent / 100), 0);
  const grandTotal = subtotal + taxTotal;

  async function handleCreate() {
    if (!formClientVendor.trim()) return;
    setCreating(true);
    try {
      const inv = await createInvoice({
        type: formType,
        client_vendor_name: formClientVendor.trim(),
        project_id: formProjectId !== "__none__" ? formProjectId : null,
        line_items: formItems.filter((i) => i.description.trim()),
        due_date: formDueDate || null,
        notes: formNotes || null,
      });
      setInvoices((prev) => [inv, ...prev]);
      setFormOpen(false);
      toast.success(SUCCESS.invoiceCreated);
    } catch {
      toast.error("Invoice didn't save \u2014 try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusUpdate(id: string, status: string) {
    try {
      await updateInvoiceStatus(id, status);
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: status as Invoice["status"] } : inv)));
      toast.success(SUCCESS.invoiceUpdated);
    } catch {
      toast.error("That didn't save \u2014 try again.");
    }
  }

  function resetForm() {
    setFormType("receivable");
    setFormClientVendor("");
    setFormProjectId("__none__");
    setFormDueDate("");
    setFormNotes("");
    setFormItems([{ description: "", quantity: 1, rate: 0, tax_percent: 18, amount: 0 }]);
  }

  const filtered = invoices.filter((inv) => {
    if (search) {
      const q = search.toLowerCase();
      if (!inv.invoice_number.toLowerCase().includes(q) && !inv.client_vendor_name.toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices..." className="h-8 pl-8 text-sm" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="receivable">Receivable</SelectItem>
            <SelectItem value="payable">Payable</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.keys(statusStyles).map((s) => (
              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" className="h-8" onClick={() => { resetForm(); setFormOpen(true); }}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Create Invoice
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border py-16 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3" />
          <p className="text-sm font-medium mb-4">No invoices yet. Create one to keep the money side of things tidy.</p>
          <Button size="sm" onClick={() => { resetForm(); setFormOpen(true); }}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Create Invoice
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client / Vendor</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => {
                const isOverdue = inv.due_date && inv.status !== "paid" && inv.status !== "cancelled" &&
                  differenceInDays(startOfDay(new Date()), startOfDay(new Date(inv.due_date))) > 0;

                return (
                  <TableRow key={inv.id} className={isOverdue ? "bg-red-50 dark:bg-red-950/10" : ""}>
                    <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {inv.type === "receivable" ? "Receivable" : "Payable"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{inv.client_vendor_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{inv.project_title || "—"}</TableCell>
                    <TableCell className="font-medium text-sm">{formatINR(inv.total_amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-[10px]", statusStyles[isOverdue ? "overdue" : inv.status])}>
                        {isOverdue ? "Overdue" : inv.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{inv.due_date ? formatDate(inv.due_date) : "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {inv.status === "draft" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => handleStatusUpdate(inv.id, "sent")}>Send</Button>
                        )}
                        {(inv.status === "sent" || inv.status === "viewed") && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => handleStatusUpdate(inv.id, "paid")}>Mark Paid</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Type *</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as "receivable" | "payable")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receivable">Receivable (Client owes us)</SelectItem>
                    <SelectItem value="payable">Payable (We owe vendor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{formType === "receivable" ? "Client" : "Vendor"} *</Label>
                <Input value={formClientVendor} onChange={(e) => setFormClientVendor(e.target.value)}
                  placeholder={formType === "receivable" ? "Client name" : "Vendor name"} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Project (optional)</Label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="No project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No project</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Due Date</Label>
                <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="h-9" />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <Label className="text-sm">Line Items</Label>
              {formItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)}
                      placeholder="Description" className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                      placeholder="Qty" className="h-8 text-sm" min={1} />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={item.rate} onChange={(e) => updateItem(idx, "rate", Number(e.target.value))}
                      placeholder="Rate" className="h-8 text-sm" min={0} />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium pt-1">
                    {formatINR(item.quantity * item.rate * (1 + item.tax_percent / 100))}
                  </div>
                  <div className="col-span-1">
                    {formItems.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setFormItems((prev) => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="h-7 text-xs"
                onClick={() => setFormItems((prev) => [...prev, { description: "", quantity: 1, rate: 0, tax_percent: 18, amount: 0 }])}>
                <Plus className="mr-1 h-3 w-3" /> Add Item
              </Button>
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatINR(taxTotal)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatINR(grandTotal)}</span></div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} placeholder="Payment instructions, terms..." />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleCreate} disabled={creating || !formClientVendor.trim()}>
              {creating ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
