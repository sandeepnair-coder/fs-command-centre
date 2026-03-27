"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Receipt, Search, Trash2 } from "lucide-react";
import {
  getExpenses,
  createExpense,
  deleteExpense,
  getExpenseSummary,
  getActiveProjects,
} from "../actions";
import type { Expense, PaymentMethod } from "@/lib/types/finance";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/types/finance";
import { formatINR, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SUCCESS } from "@/lib/copy";

const categoryColors: Record<string, string> = {
  "Vendor / Supplier": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Tools & Software": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "Travel & Transport": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Operations": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "Marketing": "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "Payroll & Contractor": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Taxes & Compliance": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Other": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [projects, setProjects] = useState<{ id: string; title: string; cost: number | null }[]>([]);
  const [summary, setSummary] = useState<{ total: number; byCategory: Record<string, number> } | null>(null);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formCategory, setFormCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [formVendor, setFormVendor] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [formProjectId, setFormProjectId] = useState("__none__");
  const [formDescription, setFormDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [e, p, s] = await Promise.all([
        getExpenses(filterCategory !== "all" ? { category: filterCategory } : undefined),
        getActiveProjects(),
        getExpenseSummary(),
      ]);
      setExpenses(e);
      setProjects(p);
      setSummary(s);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCreate() {
    if (!formAmount || Number(formAmount) <= 0) return;
    setCreating(true);
    try {
      const exp = await createExpense({
        date: formDate,
        amount: Number(formAmount),
        category: formCategory,
        vendor_payee: formVendor || null,
        payment_method: formPaymentMethod,
        project_id: formProjectId !== "__none__" ? formProjectId : null,
        description: formDescription || null,
      });
      setExpenses((prev) => [exp, ...prev]);
      setFormOpen(false);
      resetForm();
      toast.success(SUCCESS.expenseLogged);
    } catch {
      toast.error("Expense didn't save \u2014 try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success(SUCCESS.expenseDeleted);
    } catch {
      toast.error("Couldn't remove that \u2014 try again.");
    }
  }

  function resetForm() {
    setFormAmount("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormCategory(EXPENSE_CATEGORIES[0]);
    setFormVendor("");
    setFormPaymentMethod("bank_transfer");
    setFormProjectId("__none__");
    setFormDescription("");
  }

  const filtered = expenses.filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !e.description?.toLowerCase().includes(q) &&
        !e.vendor_payee?.toLowerCase().includes(q) &&
        !e.category.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      {summary && (
        <Card className="shadow-sm">
          <CardContent className="py-3 px-4 flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium">This month:</span>
            <span className="text-sm font-bold">{formatINR(summary.total)}</span>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(summary.byCategory).map(([cat, amt]) => (
                <Badge key={cat} variant="secondary" className={cn("text-[10px]", categoryColors[cat])}>
                  {cat.split(" ")[0]} {formatINR(amt)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses..." className="h-8 pl-8 text-sm" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" className="h-8" onClick={() => { resetForm(); setFormOpen(true); }}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Expense
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border py-16 text-center text-muted-foreground">
          <Receipt className="h-10 w-10 mx-auto mb-3" />
          <p className="text-sm font-medium mb-4">No expenses tracked yet. Which is either very disciplined or very suspicious.</p>
          <Button size="sm" onClick={() => { resetForm(); setFormOpen(true); }}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Expense
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="text-xs">{formatDate(exp.date)}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">
                    {exp.description || exp.vendor_payee || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[10px]", categoryColors[exp.category])}>
                      {exp.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{formatINR(exp.amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {PAYMENT_METHODS.find((m) => m.value === exp.payment_method)?.label ?? exp.payment_method}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {exp.project_title || "General"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(exp.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Expense Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Amount (₹) *</Label>
                <Input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0" className="h-9" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Date</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Payment Method</Label>
                <Select value={formPaymentMethod} onValueChange={(v) => setFormPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-sm">Vendor / Payee</Label>
                <Input value={formVendor} onChange={(e) => setFormVendor(e.target.value)} placeholder="Who did you pay?" className="h-9" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-sm">Project (optional)</Label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="No project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">General (no project)</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}{p.cost ? ` — ${formatINR(p.cost)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-sm">Description</Label>
                <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What was this for?" rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleCreate} disabled={creating || !formAmount || Number(formAmount) <= 0}>
              {creating ? "Saving..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
