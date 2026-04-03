"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Plus,
  Search,
  Globe,
  Mail,
  ListChecks,
  MessageSquare,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getClientStats, createClientFull } from "@/app/(app)/clients/actions";
import type { Client } from "@/lib/types/comms";
import { toast } from "sonner";
import { SUCCESS, EMPTY } from "@/lib/copy";

type ClientStat = {
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
};

export function ClientsShell() {
  const [clients, setClients] = useState<ClientStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // New client dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

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

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createClientFull({
        name: newName.trim(),
        primary_email: newEmail.trim() || undefined,
        website: newWebsite.trim() || undefined,
        industry: newIndustry.trim() || undefined,
      });
      toast.success(SUCCESS.clientCreated);
      setDialogOpen(false);
      setNewName("");
      setNewEmail("");
      setNewWebsite("");
      setNewIndustry("");
      loadClients();
    } catch {
      toast.error("Couldn't create the client. Try again?");
    } finally {
      setCreating(false);
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
        <div className="relative flex-1 max-w-sm">
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9">
              <Plus className="mr-1 size-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="client-name" className="text-sm">
                  Client / Brand Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="client-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. GreenLeaf Organics"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !creating) handleCreate();
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Email</Label>
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="hello@client.com"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Website</Label>
                  <Input
                    value={newWebsite}
                    onChange={(e) => setNewWebsite(e.target.value)}
                    placeholder="www.client.com"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-sm">Industry</Label>
                  <Input
                    value={newIndustry}
                    onChange={(e) => setNewIndustry(e.target.value)}
                    placeholder="e.g. F&B, Fashion, Tech"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" size="sm">Cancel</Button>
              </DialogClose>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
              >
                {creating ? "Creating..." : "Create Client"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Client Grid */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
            <Users className="mb-2 size-8" />
            <p className="text-sm font-medium">{EMPTY.clients.title}</p>
            <p className="mt-1 text-xs">{EMPTY.clients.description}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-4">
            {filtered.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`} className="group">
                <Card className="transition-colors group-hover:border-primary/50 h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {client.logo_url ? (
                          <img
                            src={client.logo_url}
                            alt=""
                            className="size-9 rounded-lg object-cover border"
                          />
                        ) : (
                          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <CardTitle className="text-sm truncate">{client.name}</CardTitle>
                          {client.industry && (
                            <CardDescription className="text-[11px] truncate">{client.industry}</CardDescription>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {client.primary_email && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                          <Mail className="size-3 shrink-0" />
                          {client.primary_email}
                        </span>
                      )}
                      {client.website && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                          <Globe className="size-3 shrink-0" />
                          {client.website}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <ListChecks className="size-3" />
                        {client.task_count} tasks
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <MessageSquare className="size-3" />
                        {client.conversation_count} threads
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
