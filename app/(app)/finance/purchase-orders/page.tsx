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
import { Plus, ShoppingCart, Search, Trash2 } from "lucide-react";
import {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePOStatus,
  deletePurchaseOrder,
  getVendors,
  createVendor,
  getActiveProjects,
} from "../actions";
import type { PurchaseOrder, Vendor, POStatus } from "@/lib/types/finance";
import { formatINR, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SUCCESS } from "@/lib/copy";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  sent: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  partially_received: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending",
  approved: "Approved",
  sent: "Sent",
  partially_received: "Partial",
  completed: "Completed",
  cancelled: "Cancelled",
};

type LineItem = { description: string; quantity: number; unit_price: number; tax_percent: number };

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string; cost: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Create PO form
  const [formOpen, setFormOpen] = useState(false);
  const [formVendorId, setFormVendorId] = useState("__none__");
  const [formProjectId, setFormProjectId] = useState("__none__");
  const [formPaymentTerms, setFormPaymentTerms] = useState("Net 30");
  const [formDeliveryDate, setFormDeliveryDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0, tax_percent: 18 },
  ]);
  const [creating, setCreating] = useState(false);

  // New vendor inline
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorEmail, setNewVendorEmail] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [o, v, p] = await Promise.all([
        getPurchaseOrders(filterStatus !== "all" ? { status: filterStatus } : undefined),
        getVendors(),
        getActiveProjects(),
      ]);
      setOrders(o);
      setVendors(v);
      setProjects(p);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  function addLineItem() {
    setFormItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, tax_percent: 18 }]);
  }

  function removeLineItem(idx: number) {
    setFormItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLineItem(idx: number, field: keyof LineItem, value: string | number) {
    setFormItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  const subtotal = formItems.reduce((s, item) => s + item.quantity * item.unit_price, 0);
  const taxTotal = formItems.reduce((s, item) => s + item.quantity * item.unit_price * (item.tax_percent / 100), 0);
  const grandTotal = subtotal + taxTotal;

  async function handleCreate() {
    if (formVendorId === "__none__" && !showNewVendor) return;
    if (formItems.every((i) => !i.description.trim())) return;

    setCreating(true);
    try {
      let vendorId = formVendorId;

      // Create vendor inline if needed
      if (showNewVendor && newVendorName.trim()) {
        const v = await createVendor({ name: newVendorName.trim(), email: newVendorEmail || null });
        vendorId = v.id;
        setVendors((prev) => [...prev, v]);
      }

      if (vendorId === "__none__") {
        toast.error("Pick a vendor first \u2014 or add a new one.");
        setCreating(false);
        return;
      }

      const po = await createPurchaseOrder({
        vendor_id: vendorId,
        project_id: formProjectId !== "__none__" ? formProjectId : null,
        payment_terms: formPaymentTerms,
        delivery_date: formDeliveryDate || null,
        notes: formNotes || null,
        line_items: formItems.filter((i) => i.description.trim()),
      });

      setOrders((prev) => [po, ...prev]);
      setFormOpen(false);
      toast.success(SUCCESS.poCreated);
    } catch {
      toast.error("PO didn't save \u2014 try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(poId: string, newStatus: POStatus) {
    try {
      await updatePOStatus(poId, newStatus);
      setOrders((prev) =>
        prev.map((po) => (po.id === poId ? { ...po, status: newStatus } : po))
      );
      toast.success(`PO status updated to ${statusLabels[newStatus]}`);
    } catch {
      toast.error("Status didn't update \u2014 try again.");
    }
  }

  async function handleDelete(poId: string) {
    try {
      await deletePurchaseOrder(poId);
      setOrders((prev) => prev.filter((po) => po.id !== poId));
      toast.success(SUCCESS.poDeleted);
    } catch {
      toast.error("Couldn't remove that \u2014 try again.");
    }
  }

  const filtered = orders.filter((po) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !po.po_number.toLowerCase().includes(q) &&
        !(po.vendor_name ?? "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  function resetForm() {
    setFormVendorId("__none__");
    setFormProjectId("__none__");
    setFormPaymentTerms("Net 30");
    setFormDeliveryDate("");
    setFormNotes("");
    setFormItems([{ description: "", quantity: 1, unit_price: 0, tax_percent: 18 }]);
    setShowNewVendor(false);
    setNewVendorName("");
    setNewVendorEmail("");
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO# or vendor..." className="h-8 pl-8 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" className="h-8" onClick={() => { resetForm(); setFormOpen(true); }}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Create PO
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border py-16 text-center text-muted-foreground">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3" />
          <p className="text-sm font-medium mb-4">No POs in the system. When you need to order something, we'll help you do it properly.</p>
          <Button size="sm" onClick={() => { resetForm(); setFormOpen(true); }}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Create PO
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-xs">{po.po_number}</TableCell>
                  <TableCell className="text-sm">{po.vendor_name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{po.project_title || "—"}</TableCell>
                  <TableCell className="font-medium text-sm">{formatINR(po.total_amount)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[10px]", statusStyles[po.status])}>
                      {statusLabels[po.status] || po.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(po.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {po.status === "draft" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs"
                          onClick={() => handleStatusChange(po.id, "pending_approval")}>Submit</Button>
                      )}
                      {po.status === "pending_approval" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs"
                          onClick={() => handleStatusChange(po.id, "approved")}>Approve</Button>
                      )}
                      {po.status === "approved" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs"
                          onClick={() => handleStatusChange(po.id, "sent")}>Send</Button>
                      )}
                      {po.status === "sent" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs"
                          onClick={() => handleStatusChange(po.id, "completed")}>Complete</Button>
                      )}
                      {po.status === "draft" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => handleDelete(po.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create PO Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* Vendor */}
            <div className="space-y-1.5">
              <Label className="text-sm">Vendor *</Label>
              {showNewVendor ? (
                <div className="grid grid-cols-2 gap-2">
                  <Input value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)}
                    placeholder="Vendor name" className="h-9" autoFocus />
                  <div className="flex gap-1">
                    <Input value={newVendorEmail} onChange={(e) => setNewVendorEmail(e.target.value)}
                      placeholder="Email (optional)" className="h-9" />
                    <Button variant="ghost" size="sm" className="h-9 px-2 shrink-0"
                      onClick={() => { setShowNewVendor(false); setFormVendorId("__none__"); }}>✕</Button>
                  </div>
                </div>
              ) : (
                <Select value={formVendorId} onValueChange={(v) => {
                  if (v === "__new__") { setShowNewVendor(true); setFormVendorId("__none__"); }
                  else setFormVendorId(v);
                }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>Select vendor</SelectItem>
                    {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    <SelectItem value="__new__">+ Add New Vendor</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Project */}
            <div className="space-y-1.5">
              <Label className="text-sm">Link to Project (optional)</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="No project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}{p.cost ? ` — Budget: ${formatINR(p.cost)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <Label className="text-sm">Line Items</Label>
              {formItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Input value={item.description} onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                      placeholder="Description" className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={item.quantity} onChange={(e) => updateLineItem(idx, "quantity", Number(e.target.value))}
                      placeholder="Qty" className="h-8 text-sm" min={1} />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={item.unit_price} onChange={(e) => updateLineItem(idx, "unit_price", Number(e.target.value))}
                      placeholder="Price" className="h-8 text-sm" min={0} />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium pt-1">
                    {formatINR(item.quantity * item.unit_price * (1 + item.tax_percent / 100))}
                  </div>
                  <div className="col-span-1">
                    {formItems.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLineItem(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addLineItem}>
                <Plus className="mr-1 h-3 w-3" /> Add Item
              </Button>
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax (18%)</span><span>{formatINR(taxTotal)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Grand Total</span><span>{formatINR(grandTotal)}</span></div>
              {grandTotal < 10000 && grandTotal > 0 && (
                <p className="text-[10px] text-emerald-600 mt-1">Under ₹10,000 — will be auto-approved</p>
              )}
            </div>

            {/* Terms */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Payment Terms</Label>
                <Select value={formPaymentTerms} onValueChange={setFormPaymentTerms}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Net 15", "Net 30", "Net 60", "Advance", "COD"].map((t) =>
                      <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Delivery Date</Label>
                <Input type="date" value={formDeliveryDate} onChange={(e) => setFormDeliveryDate(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} placeholder="Notes for your team\u2026" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleCreate}
              disabled={creating || (formVendorId === "__none__" && !showNewVendor)}>
              {creating ? "Creating..." : grandTotal < 10000 && grandTotal > 0 ? "Create & Approve" : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
