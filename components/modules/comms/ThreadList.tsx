"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail,
  Hash,
  Phone,
  Search,
  Inbox,
  AlertTriangle,
  ThumbsUp,
  Flag,
  X,
  Clock,
  CalendarClock,
  Bell,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, ChannelType } from "@/lib/types/comms";
import { STATUS_CONFIG, HEALTH_CONFIG } from "@/lib/types/comms";
import { formatDistanceToNow } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────────

type ChannelTab = "all" | ChannelType;
type QuickFilter = "all" | "needs_reply" | "approvals" | "client_waiting" | "follow_up" | "high_priority" | "unlinked";

// ─── Constants ──────────────────────────────────────────────────────────────

const CHANNEL_TABS: { value: ChannelTab; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Inbox },
  { value: "email", label: "Email", icon: Mail },
  { value: "slack", label: "Slack", icon: Hash },
  { value: "whatsapp", label: "WhatsApp", icon: Phone },
];

const QUICK_FILTERS: { value: QuickFilter; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Inbox },
  { value: "needs_reply", label: "Needs Reply", icon: AlertTriangle },
  { value: "approvals", label: "Approvals", icon: ThumbsUp },
  { value: "client_waiting", label: "Client Waiting", icon: Clock },
  { value: "follow_up", label: "Follow-up", icon: Bell },
  { value: "high_priority", label: "High Priority", icon: Flag },
  { value: "unlinked", label: "Unlinked", icon: Link2 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function ChannelIcon({ channel, className }: { channel: ChannelType; className?: string }) {
  switch (channel) {
    case "email": return <Mail className={className} />;
    case "slack": return <Hash className={className} />;
    case "whatsapp": return <Phone className={className} />;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ThreadList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: {
  conversations: (Conversation & { client_name: string | null })[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const [activeTab, setActiveTab] = useState<ChannelTab>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) => {
    if (activeTab !== "all" && c.channel !== activeTab) return false;
    if (search && !c.subject?.toLowerCase().includes(search.toLowerCase()) && !c.client_name?.toLowerCase().includes(search.toLowerCase())) return false;
    switch (quickFilter) {
      case "needs_reply": return c.status === "waiting_on_us";
      case "approvals": return c.status === "approval_pending" || c.relationship_health === "awaiting_approval";
      case "client_waiting": return c.status === "waiting_on_client";
      case "follow_up": return !!c.follow_up_at;
      case "high_priority": return c.priority === "high" || c.priority === "urgent";
      case "unlinked": return !c.client_id;
    }
    return true;
  });

  return (
    <div className="flex w-80 shrink-0 flex-col border-r">
      {/* Channels */}
      <div className="border-b px-3 pt-3 pb-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ChannelTab)}>
          <TabsList className="w-full">
            {CHANNEL_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex-1 gap-1 text-xs">
                <tab.icon className="size-3" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Quick Filters */}
      <div className="border-b px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {QUICK_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setQuickFilter(f.value)}
              className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                quickFilter === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}>
              <f.icon className="size-2.5" /> {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="border-b px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client, project, keyword..." className="h-8 pl-8 text-sm" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search"><X className="size-3.5" /></button>}
        </div>
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Inbox className="mb-2 size-8 animate-pulse" />
            <p className="text-sm font-medium">Loading conversations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Inbox className="mb-2 size-8" />
            <p className="text-sm font-medium">
              {activeTab !== "all" || quickFilter !== "all" ? "No matching conversations" : "No conversations yet"}
            </p>
            <p className="mt-1 text-xs text-pretty">
              {activeTab !== "all" || quickFilter !== "all"
                ? "Try adjusting your filters."
                : "Connect Gmail, Slack, or WhatsApp in Settings > Integrations."}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((convo) => (
              <button key={convo.id} onClick={() => onSelect(convo.id)}
                className={cn("w-full px-3 py-3 text-left transition-colors hover:bg-muted/50", selectedId === convo.id && "bg-muted")}>
                {/* Row 1: client + channel + time */}
                <div className="flex items-center gap-2">
                  {/* Client avatar */}
                  {convo.client_name ? (
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                      {convo.client_name.charAt(0)}
                    </div>
                  ) : (
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground shrink-0">?</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold truncate">{convo.client_name || (convo as any).participants_summary || "Unlinked"}</span>
                      <ChannelIcon channel={convo.channel} className="size-3 shrink-0 text-muted-foreground" />
                      {convo.priority === "urgent" && <span className="size-1.5 rounded-full bg-red-500 shrink-0" />}
                      {convo.priority === "high" && <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{convo.subject || "(No subject)"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: false })}
                    </span>
                    {(convo.unread_count ?? 0) > 0 && (
                      <Badge className="h-4 px-1.5 text-[9px] bg-primary text-primary-foreground">{convo.unread_count}</Badge>
                    )}
                  </div>
                </div>
                {/* Row 2: status + waiting + health */}
                <div className="mt-1.5 ml-9 flex items-center gap-1.5">
                  <Badge variant="outline" className={cn("text-[9px] h-4 px-1", STATUS_CONFIG[convo.status].color)}>
                    <span className={cn("size-1.5 rounded-full mr-0.5", STATUS_CONFIG[convo.status].dot)} />
                    {STATUS_CONFIG[convo.status].label}
                  </Badge>
                  {convo.follow_up_at && <CalendarClock className="size-3 text-amber-500" />}
                  {convo.relationship_health !== "active" && (
                    <span className={cn("text-[9px] font-medium", HEALTH_CONFIG[convo.relationship_health].color)}>
                      {HEALTH_CONFIG[convo.relationship_health].label}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
