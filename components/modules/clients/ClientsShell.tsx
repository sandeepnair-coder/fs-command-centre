"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  X,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { getClientStats, deleteClient } from "@/app/(app)/clients/actions";
import { toast } from "sonner";
import type { ClientStat } from "@/lib/types/clients";
import { ClientGrid } from "./ClientGrid";
import { AddClientDialog } from "./dialogs/AddClientDialog";

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export function ClientsShell({ initialClients = [] }: { initialClients?: ClientStat[] } = {}) {
  const [clients, setClients] = useState<ClientStat[]>(initialClients);
  const [loading, setLoading] = useState(initialClients.length === 0);
  const [search, setSearch] = useState("");

  // Dialog state
  const [quickOpen, setQuickOpen] = useState(false);

  // Selection + bulk delete
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (initialClients.length === 0) loadClients(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  async function loadClients() {
    setLoading(true);
    try {
      const data = await getClientStats();
      setClients(data);
    } catch {
      // Tables may not exist yet
    } finally {
      setLoading(false);
    }
  }

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.primary_email?.toLowerCase().includes(q) ||
      c.industry?.toLowerCase().includes(q)
    );
  });

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someSelected = filtered.some((c) => selected.has(c.id));

  // ── Selection handlers ────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      await Promise.all([...selected].map((id) => deleteClient(id)));
      setClients((prev) => prev.filter((c) => !selected.has(c.id)));
      toast.success(`${selected.size} client${selected.size > 1 ? "s" : ""} deleted`);
      setSelected(new Set());
    } catch {
      toast.error("Some clients couldn't be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-36 rounded-xl border bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3 shrink-0">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label={allSelected ? "Deselect all" : "Select all"}
        >
          {allSelected ? <CheckSquare className="size-4 text-primary" /> : someSelected ? <MinusSquare className="size-4 text-primary" /> : <Square className="size-4" />}
          {allSelected ? "Deselect all" : "Select all"}
        </button>

        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs"
            onClick={handleBulkDelete}
            disabled={deleting}
          >
            <Trash2 className="mr-1 size-3.5" />
            {deleting ? "Deleting..." : `Delete ${selected.size} client${selected.size > 1 ? "s" : ""}`}
          </Button>
        )}

        <div className="relative flex-1 max-w-sm ml-auto">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="h-9 pl-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Button size="sm" className="h-9" onClick={() => setQuickOpen(true)}>
          <Plus className="mr-1 size-4" />
          Add Client
        </Button>
      </div>

      {/* Client Grid */}
      <ClientGrid
        clients={filtered}
        selectedIds={selected}
        onToggleSelect={toggleSelect}
      />

      {/* Add Client Dialog (Quick + Advanced) */}
      <AddClientDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
        onClientCreated={loadClients}
      />
    </div>
  );
}
