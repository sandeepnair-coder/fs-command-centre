"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Globe,
  Mail,
  ListChecks,
  MessageSquare,
  Users,
  CheckSquare,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPTY } from "@/lib/copy";
import type { ClientStat } from "@/lib/types/clients";

interface ClientGridProps {
  clients: ClientStat[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export function ClientGrid({
  clients,
  selectedIds,
  onToggleSelect,
}: ClientGridProps) {
  return (
    <ScrollArea className="flex-1">
      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <Users className="mb-2 size-8" />
          <p className="text-sm font-medium">{EMPTY.clients.title}</p>
          <p className="mt-1 text-xs">{EMPTY.clients.description}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-4">
          {clients.map((client) => {
            const isSelected = selectedIds.has(client.id);
            return (
              <div key={client.id} className="relative group">
                {/* Checkbox overlay */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(client.id); }}
                  className={cn(
                    "absolute left-2 top-2 z-10 rounded p-0.5 transition-opacity",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  aria-label={isSelected ? `Deselect ${client.name}` : `Select ${client.name}`}
                >
                  {isSelected
                    ? <CheckSquare className="size-4.5 text-primary" />
                    : <Square className="size-4.5 text-muted-foreground/50 hover:text-foreground" />
                  }
                </button>

                <Link href={`/clients/${client.id}`}>
                  <Card className={cn(
                    "transition-colors hover:border-primary/50 h-full",
                    isSelected && "border-primary/60 bg-primary/5"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {client.thumbnail_url ? (
                            <img src={client.thumbnail_url} alt="" className="size-9 rounded-full object-cover border" />
                          ) : client.logo_url ? (
                            <img src={client.logo_url} alt="" className="size-9 rounded-full object-cover border" />
                          ) : (
                            <div className="flex size-9 items-center justify-center rounded-full bg-muted border border-border text-sm font-bold text-foreground shrink-0">
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
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
}
