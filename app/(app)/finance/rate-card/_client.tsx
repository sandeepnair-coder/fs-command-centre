"use client";

import React, { useState, useCallback, useRef, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "@/components/ui/dialog";
import { Upload, Download, Clock, Plus, X, Pencil } from "lucide-react";
import type {
  RateCardVersion,
  RateCardTier,
  RateCardItem,
  RateCardDeliverable,
  RateCardChange,
  RateCardSection,
} from "@/lib/types/rate-card";
import { SECTION_LABELS } from "@/lib/types/rate-card";
import { computeAllTierPrices } from "@/lib/rate-card/compute";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  updateItemField,
  revertChange,
  getChangeLog,
  getVersionData,
} from "./actions";

// ─── Props ─────────────────────────────────────────────────────────────────

type Props = {
  initialVersion: RateCardVersion | null;
  initialVersions: RateCardVersion[];
  initialTiers: RateCardTier[];
  initialItems: RateCardItem[];
  initialDeliverables: RateCardDeliverable[];
  initialChanges: RateCardChange[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatCurrency(value: number, symbol: string) {
  if (symbol === "₹") return formatINR(value);
  return `${symbol}${value.toLocaleString("en-US")}`;
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const SECTIONS = Object.keys(SECTION_LABELS) as RateCardSection[];

// ─── Component ─────────────────────────────────────────────────────────────

export function RateCardClient({
  initialVersion,
  initialVersions,
  initialTiers,
  initialItems,
  initialDeliverables,
  initialChanges,
}: Props) {
  // State
  const [version, setVersion] = useState(initialVersion);
  const [versions] = useState(initialVersions);
  const [tiers, setTiers] = useState(initialTiers);
  const [items, setItems] = useState(initialItems);
  const [, setDeliverables] = useState(initialDeliverables);
  const [changes, setChanges] = useState(initialChanges);
  const [activeSection, setActiveSection] = useState<RateCardSection>("alacarte");
  const [changeLogOpen, setChangeLogOpen] = useState(false);

  // Inline edit state
  const [editingCell, setEditingCell] = useState<{
    itemId: string;
    field: "base_inr" | "sla";
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reason dialog state
  const [reasonDialog, setReasonDialog] = useState<{
    itemId: string;
    field: "base_inr" | "sla";
    newValue: string;
    oldValue: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Revert confirmation
  const [revertDialog, setRevertDialog] = useState<string | null>(null);
  const [reverting, setReverting] = useState(false);

  const fxRate = version?.fx_rate ?? 83;

  // Filter items by active section
  const sectionItems = items
    .filter((item) => item.section === activeSection)
    .sort((a, b) => a.sort_order - b.sort_order);

  // ── Version switch ────────────────────────────────────────────────────

  const handleVersionSwitch = useCallback(
    async (versionId: string) => {
      const v = versions.find((ver) => ver.id === versionId);
      if (!v) return;
      setVersion(v);
      try {
        const [data, log] = await Promise.all([
          getVersionData(versionId),
          getChangeLog(versionId),
        ]);
        setTiers(data.tiers);
        setItems(data.items);
        setDeliverables(data.deliverables);
        setChanges(log);
      } catch {
        toast.error("Failed to load version data");
      }
    },
    [versions]
  );

  // ── Inline editing ────────────────────────────────────────────────────

  const startEdit = useCallback(
    (itemId: string, field: "base_inr" | "sla") => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      const value = field === "base_inr" ? String(item.base_inr) : (item.sla ?? "");
      setEditingCell({ itemId, field });
      setEditValue(value);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [items]
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const item = items.find((i) => i.id === editingCell.itemId);
    if (!item) {
      setEditingCell(null);
      return;
    }
    const oldValue =
      editingCell.field === "base_inr" ? String(item.base_inr) : (item.sla ?? "");

    if (editValue === oldValue || editValue.trim() === "") {
      setEditingCell(null);
      return;
    }

    // Open reason dialog
    setReasonDialog({
      itemId: editingCell.itemId,
      field: editingCell.field,
      newValue: editValue,
      oldValue,
    });
    setReason("");
    setEditingCell(null);
  }, [editingCell, editValue, items]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleReasonSubmit = useCallback(async () => {
    if (!reasonDialog) return;
    setSaving(true);
    try {
      await updateItemField(
        reasonDialog.itemId,
        reasonDialog.field,
        reasonDialog.newValue,
        reason
      );
      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === reasonDialog.itemId
            ? {
                ...item,
                [reasonDialog.field]:
                  reasonDialog.field === "base_inr"
                    ? Number(reasonDialog.newValue)
                    : reasonDialog.newValue,
              }
            : item
        )
      );
      // Refresh change log
      if (version) {
        const log = await getChangeLog(version.id);
        setChanges(log);
      }
      toast.success("Price updated");
      setChangeLogOpen(true);
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
      setReasonDialog(null);
    }
  }, [reasonDialog, reason, version]);

  // ── Revert ────────────────────────────────────────────────────────────

  const handleRevert = useCallback(async () => {
    if (!revertDialog) return;
    setReverting(true);
    try {
      await revertChange(revertDialog, "Reverted");
      // Refresh data
      if (version) {
        const [data, log] = await Promise.all([
          getVersionData(version.id),
          getChangeLog(version.id),
        ]);
        setItems(data.items);
        setChanges(log);
      }
      toast.success("Change reverted");
    } catch {
      toast.error("Failed to revert");
    } finally {
      setReverting(false);
      setRevertDialog(null);
    }
  }, [revertDialog, version]);

  // ── Empty state ───────────────────────────────────────────────────────

  if (!version) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-muted-foreground text-sm">
          No rate card yet. Upload an xlsx or create a new version to get started.
        </p>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="mr-1.5 h-4 w-4" />
          New Version
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Select value={version.id} onValueChange={handleVersionSwitch}>
            <SelectTrigger className="h-9 w-56 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.version_label}
                  {v.is_active ? " (Active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            FX: 1 USD = {fxRate.toFixed(2)} INR
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Upload className="h-4 w-4" />
            Upload xlsx
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" />
            Download xlsx
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5", changeLogOpen && "bg-accent")}
            onClick={() => setChangeLogOpen(!changeLogOpen)}
          >
            <Clock className="h-4 w-4" />
            Change Log
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
            <Plus className="h-4 w-4" />
            New Version
          </Button>
        </div>
      </div>

      {/* ── Section tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-4 flex-wrap" role="tablist" aria-label="Rate card sections">
        {SECTIONS.map((section) => (
          <button
            key={section}
            role="tab"
            aria-selected={activeSection === section}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md border h-8 transition-colors",
              activeSection === section
                ? "bg-emerald-50 text-emerald-800 border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-600"
                : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
            )}
            onClick={() => setActiveSection(section)}
          >
            {SECTION_LABELS[section]}
          </button>
        ))}
      </div>

      {/* ── Instructional banner ──────────────────────────────────────────── */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 mb-3 flex items-center gap-2">
        <Pencil className="h-3 w-3 shrink-0" />
        <span>
          Click any <strong>INR price</strong> or <strong>SLA</strong> cell to edit
          inline — all USD tiers auto-update.
        </span>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-xs" aria-label={`${SECTION_LABELS[activeSection]} rate card pricing`}>
          <thead>
            {/* Tier header row */}
            <tr className="bg-muted/50">
              <th className="sticky left-0 bg-muted/50 px-3 py-2.5 text-left font-semibold text-muted-foreground min-w-[200px] z-10">
                Format
              </th>
              <th className="px-2 py-2.5 text-center font-semibold text-muted-foreground w-16">
                Length
              </th>
              <th className="px-2 py-2.5 text-center font-semibold text-muted-foreground w-16">
                SLA
              </th>
              {tiers.map((tier) => (
                <th
                  key={tier.id}
                  colSpan={2}
                  className={cn(
                    "px-2 py-2.5 text-right font-semibold min-w-[120px]",
                    tier.currency === "INR"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-blue-700 dark:text-blue-400"
                  )}
                >
                  {tier.name} ({tier.currency})
                </th>
              ))}
            </tr>
            {/* List / Floor sub-header */}
            <tr className="bg-muted/30 border-b">
              <th className="sticky left-0 bg-muted/30 z-10" />
              <th />
              <th />
              {tiers.map((tier) => (
                <Fragment key={tier.id}>
                  <th className="px-1 py-1 text-[10px] text-right text-muted-foreground font-medium">
                    List
                  </th>
                  <th className="px-1 py-1 text-[10px] text-right text-muted-foreground font-medium">
                    Floor
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {sectionItems.length === 0 && (
              <tr>
                <td
                  colSpan={3 + tiers.length * 2}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No items in this section yet.
                </td>
              </tr>
            )}
            {sectionItems.map((item, idx) => {
              const prices = computeAllTierPrices(
                item.base_inr,
                item.floor_percent,
                tiers,
                fxRate
              );
              const stripe = idx % 2 === 1;

              return (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b hover:bg-muted/30 transition-colors",
                    stripe && "bg-muted/10"
                  )}
                >
                  {/* Item name — sticky */}
                  <td
                    className={cn(
                      "sticky left-0 z-10 px-3 py-2 font-medium text-foreground",
                      stripe ? "bg-muted/10" : "bg-card"
                    )}
                  >
                    {item.name}
                  </td>

                  {/* Length */}
                  <td className="px-2 py-2 text-center text-muted-foreground">
                    {item.length ?? "—"}
                  </td>

                  {/* SLA — editable */}
                  <td
                    className={cn(
                      "px-2 py-2 text-center text-muted-foreground group cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors",
                      editingCell?.itemId === item.id &&
                        editingCell.field === "sla" &&
                        "p-0"
                    )}
                    onClick={() => {
                      if (
                        !(
                          editingCell?.itemId === item.id &&
                          editingCell.field === "sla"
                        )
                      ) {
                        startEdit(item.id, "sla");
                      }
                    }}
                  >
                    {editingCell?.itemId === item.id &&
                    editingCell.field === "sla" ? (
                      <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitEdit();
                          }
                          if (e.key === "Escape") cancelEdit();
                        }}
                        onBlur={commitEdit}
                        className="h-7 text-xs text-center border-2 border-emerald-400 rounded"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {item.sla ?? "—"}
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </span>
                    )}
                  </td>

                  {/* Tier price columns */}
                  {prices.map((tp) => {
                    const isINR = tp.currency === "INR";
                    const isEditing =
                      isINR &&
                      editingCell?.itemId === item.id &&
                      editingCell.field === "base_inr";

                    return (
                      <Fragment key={tp.tier_key}>
                        {/* List price */}
                        <td
                          className={cn(
                            "px-2 py-2 text-right font-medium",
                            isINR
                              ? "text-emerald-700 dark:text-emerald-400 group cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                              : "text-blue-700 dark:text-blue-400",
                            isEditing && "p-0"
                          )}
                          onClick={
                            isINR && !isEditing
                              ? () => startEdit(item.id, "base_inr")
                              : undefined
                          }
                        >
                          {isEditing ? (
                            <Input
                              ref={inputRef}
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitEdit();
                                }
                                if (e.key === "Escape") cancelEdit();
                              }}
                              onBlur={commitEdit}
                              className="h-7 text-xs text-right border-2 border-emerald-400 rounded w-24"
                            />
                          ) : isINR ? (
                            <span className="inline-flex items-center gap-1">
                              {formatCurrency(tp.list, tp.symbol)}
                              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </span>
                          ) : (
                            formatCurrency(tp.list, tp.symbol)
                          )}
                        </td>
                        {/* Floor price */}
                        <td className="px-2 py-2 text-right text-muted-foreground">
                          {formatCurrency(tp.floor, tp.symbol)}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Reason dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={!!reasonDialog}
        onOpenChange={(open) => {
          if (!open) setReasonDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reason for change</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-sm text-muted-foreground">
              {reasonDialog && (
                <>
                  Changing{" "}
                  <strong className="text-foreground">
                    {reasonDialog.field === "base_inr" ? "Base INR" : "SLA"}
                  </strong>{" "}
                  from{" "}
                  <span className="line-through text-red-500">
                    {reasonDialog.field === "base_inr"
                      ? formatINR(Number(reasonDialog.oldValue))
                      : reasonDialog.oldValue}
                  </span>{" "}
                  to{" "}
                  <span className="text-emerald-600 font-semibold">
                    {reasonDialog.field === "base_inr"
                      ? formatINR(Number(reasonDialog.newValue))
                      : reasonDialog.newValue}
                  </span>
                </>
              )}
            </div>
            <div>
              <Label htmlFor="change-reason" className="text-xs font-semibold">
                Reason
              </Label>
              <Textarea
                id="change-reason"
                placeholder="Why is this change needed?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReasonDialog(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleReasonSubmit}
            >
              {saving ? "Saving..." : "Save Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revert confirmation dialog ────────────────────────────────────── */}
      <Dialog
        open={!!revertDialog}
        onOpenChange={(open) => {
          if (!open) setRevertDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Revert this change?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will restore the previous value and mark the change as reverted
            in the audit trail.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevertDialog(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={reverting}
              onClick={handleRevert}
            >
              {reverting ? "Reverting..." : "Revert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Log overlay ────────────────────────────────────────────── */}
      {changeLogOpen && (
        <div
          className="fixed right-0 top-28 bottom-0 w-[440px] z-50 bg-card border-l shadow-lg flex flex-col"
          role="log"
          aria-label="Rate card audit trail"
        >
          {/* Header */}
          <div className="p-3 border-b flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-semibold">Audit Trail</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {version.version_label}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setChangeLogOpen(false)}
              aria-label="Close change log"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-0 border-b shrink-0">
            <div className="px-3 py-2 text-center border-r">
              <div className="text-lg font-bold">{changes.length}</div>
              <div className="text-[10px] text-muted-foreground font-medium">
                Total changes
              </div>
            </div>
            <div className="px-3 py-2 text-center border-r">
              <div className="text-lg font-bold text-amber-600">
                {changes.filter((c) => !c.reverted_at).length}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                Active
              </div>
            </div>
            <div className="px-3 py-2 text-center">
              <div className="text-lg font-bold text-red-600">
                {changes.filter((c) => c.reverted_at).length}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                Reverted
              </div>
            </div>
          </div>

          {/* Entries */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {changes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No changes recorded yet.
                </p>
              )}
              {changes.map((change) => {
                const isReverted = !!change.reverted_at;
                const itemName =
                  items.find((i) => i.id === change.entity_id)?.name ??
                  "Unknown item";

                return (
                  <div
                    key={change.id}
                    className={cn(
                      "rounded-lg border overflow-hidden",
                      isReverted && "opacity-50"
                    )}
                  >
                    {/* Change header */}
                    <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
                          {(change.changer_name ?? "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold">
                            {change.changer_name ?? "User"}
                          </span>
                          <span className="text-[11px] text-muted-foreground ml-1">
                            {formatTimestamp(change.changed_at)}
                          </span>
                        </div>
                      </div>
                      {isReverted && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-1.5 py-0.5"
                        >
                          Reverted
                        </Badge>
                      )}
                    </div>

                    {/* Change body */}
                    <div className="px-3 py-2.5 border-t bg-card">
                      <div className="text-[11px] mb-1.5">
                        Changed{" "}
                        <span className="font-semibold text-foreground">
                          {itemName}
                        </span>{" "}
                        {change.field === "base_inr" ? "base INR" : change.field}
                      </div>

                      {/* Before / After */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Before:
                        </span>
                        <span className="text-[11px] px-2 py-0.5 bg-red-50 dark:bg-red-950/30 text-red-600 rounded font-mono font-semibold line-through">
                          {change.old_value ?? "—"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          →
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          After:
                        </span>
                        <span
                          className={cn(
                            "text-[11px] px-2 py-0.5 rounded font-mono font-semibold",
                            isReverted
                              ? "bg-red-50 dark:bg-red-950/30 text-red-400 line-through"
                              : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600"
                          )}
                        >
                          {change.new_value ?? "—"}
                        </span>
                      </div>

                      {/* Reason */}
                      {change.reason && (
                        <div className="bg-muted/50 rounded px-2.5 py-1.5 mb-2">
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase mb-0.5">
                            Reason
                          </div>
                          <div className="text-[11px]">{change.reason}</div>
                        </div>
                      )}

                      {/* Revert button */}
                      {!isReverted && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] text-red-600 hover:bg-red-50 hover:border-red-300"
                            onClick={() => setRevertDialog(change.id)}
                          >
                            Revert
                          </Button>
                        </div>
                      )}

                      {/* Reverted info */}
                      {isReverted && change.reverted_at && (
                        <div className="text-[11px] text-muted-foreground">
                          Reverted{" "}
                          {formatTimestamp(change.reverted_at)}
                          {change.reverter_name && ` by ${change.reverter_name}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
