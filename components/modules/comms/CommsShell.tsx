"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Hash,
  Phone,
  Search,
  Inbox,
  CheckCircle2,
  ListPlus,
  Bookmark,
  ThumbsUp,
  Flag,
  Copy,
  MessageSquare,
  Paperclip,
  X,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  User,
  Building2,
  Globe,
  CalendarClock,
  Zap,
  Target,
  Link2,
  ExternalLink,
  Bell,
  CircleDot,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getConversations, getMessages, getClientCrmInsight } from "@/app/(app)/comms/actions";
import type {
  Conversation,
  CommsMessage,
  ChannelType,
  ConversationStatus,
} from "@/lib/types/comms";
import {
  CHANNEL_CONFIG,
  CLASSIFICATION_CONFIG,
  STATUS_CONFIG,
  HEALTH_CONFIG,
  PRIORITY_CONFIG,
  SENTIMENT_CONFIG,
} from "@/lib/types/comms";
import { formatDistanceToNow, format } from "date-fns";

type ChannelTab = "all" | ChannelType;
type QuickFilter = "all" | "needs_reply" | "approvals" | "client_waiting" | "follow_up" | "high_priority" | "unlinked";

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

function ChannelIcon({ channel, className }: { channel: ChannelType; className?: string }) {
  switch (channel) {
    case "email": return <Mail className={className} />;
    case "slack": return <Hash className={className} />;
    case "whatsapp": return <Phone className={className} />;
  }
}

// ─── Demo Data (CRM-upgraded) ───────────────────────────────────────────────

const DEMO_CONVERSATIONS: (Conversation & { client_name: string | null })[] = [
  {
    id: "demo-1", channel: "email", external_thread_id: "thread-001", client_id: "c1", project_id: null,
    subject: "Website redesign — final feedback", last_message_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    participants: ["priya@greenleaf.co", "design@fyndstudio.com"], is_resolved: false,
    status: "waiting_on_us", priority: "high", follow_up_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    follow_up_owner: null, linked_project_id: null, last_client_reply_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    last_team_reply_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    relationship_health: "active", waiting_on: "team",
    extracted_asks: [{ text: "Add testimonial section below the fold", resolved: false }, { text: "Waiting for quotes from Rahul (marketing)", resolved: false }],
    extracted_decisions: [{ text: "Homepage approved with minor changes", date: new Date().toISOString() }],
    extracted_deadlines: [{ text: "Testimonials by tomorrow", date: new Date(Date.now() + 86400000).toISOString() }],
    ai_summary: "Client approved homepage with 2 minor changes (hero size, CTA color). New request for testimonial section — potential task. Rahul sending quotes tomorrow.",
    sentiment: "positive",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    client_name: "GreenLeaf Organics", client_industry: "Organic Food", message_count: 8, unread_count: 2,
  },
  {
    id: "demo-2", channel: "slack", external_thread_id: "thread-002", client_id: "c2", project_id: null,
    subject: "Logo variations — round 2", last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    participants: ["#project-bluewave", "arun", "neha"], is_resolved: false,
    status: "waiting_on_client", priority: "normal", follow_up_at: null,
    follow_up_owner: null, linked_project_id: null,
    last_client_reply_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    last_team_reply_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    relationship_health: "awaiting_approval", waiting_on: "client",
    extracted_asks: [], extracted_decisions: [{ text: "Option B selected for logo direction", date: new Date().toISOString() }],
    extracted_deadlines: [], ai_summary: "Logo exploration round 2. Team leaning towards Option B. Awaiting client confirmation + tagline version.",
    sentiment: "neutral",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    client_name: "BlueWave Tech", client_industry: "Technology", message_count: 14, unread_count: 0,
  },
  {
    id: "demo-3", channel: "whatsapp", external_thread_id: "thread-003", client_id: "c3", project_id: null,
    subject: "Diwali campaign — urgent changes", last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    participants: ["+91 98765 43210", "Rahul (Spice Junction)"], is_resolved: false,
    status: "waiting_on_us", priority: "urgent", follow_up_at: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    follow_up_owner: null, linked_project_id: null,
    last_client_reply_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    last_team_reply_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    relationship_health: "at_risk", waiting_on: "team",
    extracted_asks: [{ text: "Change poster background to gold", resolved: false }, { text: "Create Instagram Stories version (1080x1920)", resolved: false }],
    extracted_decisions: [], extracted_deadlines: [{ text: "Deadline: tomorrow morning", date: new Date(Date.now() + 43200000).toISOString() }],
    ai_summary: "Urgent: Diwali poster background change from red to gold. Need Instagram Stories format. Deadline tomorrow morning. HIGH RISK of delay.",
    sentiment: "urgent",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    client_name: "Spice Junction", client_industry: "F&B", message_count: 6, unread_count: 3,
  },
  {
    id: "demo-4", channel: "email", external_thread_id: "thread-004", client_id: null, project_id: null,
    subject: "New inquiry — packaging design", last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    participants: ["hello@freshbrew.in"], is_resolved: false,
    status: "open", priority: "normal", follow_up_at: null, follow_up_owner: null, linked_project_id: null,
    last_client_reply_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), last_team_reply_at: null,
    relationship_health: "active", waiting_on: "team",
    extracted_asks: [{ text: "Wants packaging design for 3 tea variants", resolved: false }],
    extracted_decisions: [], extracted_deadlines: [],
    ai_summary: "New lead. FreshBrew wants packaging design for 3 tea variants. No client record exists yet.",
    sentiment: "positive",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    client_name: null, client_industry: null, message_count: 1, unread_count: 1,
  },
];

const DEMO_MESSAGES: Record<string, CommsMessage[]> = {
  "demo-1": [
    { id: "m1", conversation_id: "demo-1", channel: "email", client_id: "c1", project_id: null, sender_display_name: "Priya Sharma", sender_identifier: "priya@greenleaf.co", body_text: "Hi team, the homepage looks great! Two small things:\n\n1. Can we make the hero image larger?\n2. The CTA button colour should match our brand green (#2D7F3A)\n\nOtherwise approved to go live.", classification: "approval", has_attachments: false, is_from_client: true, source_url: null, extracted_entities: null, linked_task_ids: [], linked_fact_ids: [], created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
    { id: "m2", conversation_id: "demo-1", channel: "email", client_id: "c1", project_id: null, sender_display_name: "Neha (Fynd Studio)", sender_identifier: "neha@fyndstudio.com", body_text: "Thanks Priya! Hero image enlarged and CTA updated to #2D7F3A. Preview link coming in 30 mins.", classification: "general", has_attachments: false, is_from_client: false, source_url: null, extracted_entities: null, linked_task_ids: [], linked_fact_ids: [], created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: "m3", conversation_id: "demo-1", channel: "email", client_id: "c1", project_id: null, sender_display_name: "Priya Sharma", sender_identifier: "priya@greenleaf.co", body_text: "Perfect. Also, can we add a testimonial section below the fold? Rahul from marketing will send the quotes by tomorrow.", classification: "task_candidate", has_attachments: false, is_from_client: true, source_url: null, extracted_entities: null, linked_task_ids: [], linked_fact_ids: [], created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  ],
  "demo-3": [
    { id: "m6", conversation_id: "demo-3", channel: "whatsapp", client_id: "c3", project_id: null, sender_display_name: "Rahul (Spice Junction)", sender_identifier: "+919876543210", body_text: "The Diwali poster needs a last-minute change. Can we swap the background to gold instead of red? The festival theme shifted.", classification: "task_candidate", has_attachments: false, is_from_client: true, source_url: null, extracted_entities: null, linked_task_ids: [], linked_fact_ids: [], created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() },
    { id: "m7", conversation_id: "demo-3", channel: "whatsapp", client_id: "c3", project_id: null, sender_display_name: "Meera (Fynd Studio)", sender_identifier: "+919988776655", body_text: "On it! Will send the updated version by EOD. Any other changes to the copy?", classification: "general", has_attachments: false, is_from_client: false, source_url: null, extracted_entities: null, linked_task_ids: [], linked_fact_ids: [], created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
    { id: "m8", conversation_id: "demo-3", channel: "whatsapp", client_id: "c3", project_id: null, sender_display_name: "Rahul (Spice Junction)", sender_identifier: "+919876543210", body_text: "Copy is fine. Just the background. Also need this for Instagram Stories format — 1080x1920. Deadline is tomorrow morning.", classification: "blocker", has_attachments: false, is_from_client: true, source_url: null, extracted_entities: null, linked_task_ids: [], linked_fact_ids: [], created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CommsShell() {
  const [activeTab, setActiveTab] = useState<ChannelTab>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<(Conversation & { client_name: string | null })[]>(DEMO_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommsMessage[]>([]);
  const [clientInsight, setClientInsight] = useState<Awaited<ReturnType<typeof getClientCrmInsight>> | null>(null);

  useEffect(() => {
    getConversations().then((data) => { if (data.length > 0) setConversations(data); }).catch(() => {});
  }, []);

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

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    const convo = conversations.find((c) => c.id === id);
    if (DEMO_MESSAGES[id]) setMessages(DEMO_MESSAGES[id]);
    else getMessages(id).then(setMessages).catch(() => setMessages([]));
    if (convo?.client_id && !convo.client_id.startsWith("c")) {
      getClientCrmInsight(convo.client_id).then(setClientInsight).catch(() => setClientInsight(null));
    } else {
      setClientInsight(null);
    }
  }, [conversations]);

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-full overflow-hidden rounded-lg border bg-card">
      {/* ═══ LEFT: Thread List ═══ */}
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
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Inbox className="mb-2 size-8" />
              <p className="text-sm font-medium">No conversations</p>
              <p className="mt-1 text-xs text-pretty">Threads will appear once channels are connected.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((convo) => (
                <button key={convo.id} onClick={() => handleSelect(convo.id)}
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
                        <span className="text-xs font-semibold truncate">{convo.client_name || "Unlinked"}</span>
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

      {/* ═══ CENTER: Message Timeline ═══ */}
      <div className="flex flex-1 flex-col min-w-0">
        {selected ? (
          <>
            {/* Thread header */}
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <ChannelIcon channel={selected.channel} className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold truncate text-balance">{selected.subject || "(No subject)"}</h2>
                <Badge variant="outline" className={cn("text-[10px]", STATUS_CONFIG[selected.status].color)}>
                  {STATUS_CONFIG[selected.status].label}
                </Badge>
                {selected.priority !== "normal" && (
                  <Badge variant="outline" className="text-[10px]">
                    <span className={cn("size-1.5 rounded-full mr-0.5", PRIORITY_CONFIG[selected.priority].dot)} />
                    {PRIORITY_CONFIG[selected.priority].label}
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                {selected.client_name ? (
                  <Link href={selected.client_id ? `/clients/${selected.client_id}` : "/clients"} className="font-medium text-primary hover:underline flex items-center gap-1">
                    <Building2 className="size-3" /> {selected.client_name}
                  </Link>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="size-3" /> Unlinked thread</span>
                )}
                <span className="tabular-nums">{selected.participants.length} participants</span>
                {selected.waiting_on && <span className="flex items-center gap-1"><Clock className="size-3" /> Waiting on {selected.waiting_on}</span>}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("rounded-lg border p-3", msg.is_from_client ? "bg-background" : "bg-muted/30")}>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-medium", msg.is_from_client ? "text-primary" : "text-foreground")}>
                        {msg.sender_display_name || "Unknown"}
                      </span>
                      {msg.is_from_client && <Badge variant="outline" className="text-[9px] h-3.5 px-1">Client</Badge>}
                      <Badge variant="outline" className={cn("text-[9px] h-3.5 px-1", CHANNEL_CONFIG[msg.channel].color)}>
                        {CHANNEL_CONFIG[msg.channel].label}
                      </Badge>
                      {msg.classification && msg.classification !== "general" && (
                        <Badge variant="secondary" className={cn("text-[9px] h-3.5 px-1", CLASSIFICATION_CONFIG[msg.classification].color)}>
                          {CLASSIFICATION_CONFIG[msg.classification].label}
                        </Badge>
                      )}
                      {msg.has_attachments && <Paperclip className="size-3 text-muted-foreground" />}
                      <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                        {format(new Date(msg.created_at), "d MMM, h:mm a")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap text-pretty leading-relaxed">{msg.body_text}</p>
                    {/* Inline actions */}
                    <div className="mt-2 flex flex-wrap gap-1 opacity-0 hover:opacity-100 transition-opacity focus-within:opacity-100">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"><ListPlus className="mr-0.5 size-3" /> Task</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"><Bookmark className="mr-0.5 size-3" /> Fact</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"><UserPlus className="mr-0.5 size-3" /> Contact</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"><ThumbsUp className="mr-0.5 size-3" /> Approval</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"><CalendarClock className="mr-0.5 size-3" /> Follow-up</Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="mb-2 size-10" />
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="mt-1 text-xs text-pretty">Pick a thread to see the timeline, client context, and actions.</p>
          </div>
        )}
      </div>

      {/* ═══ RIGHT: CRM Insight Panel ═══ */}
      <div className="w-80 shrink-0 border-l">
        {selected ? (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">

              {/* Client Snapshot */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">Client Snapshot</p>
                {selected.client_name ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{selected.client_name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-semibold">{selected.client_name}</p>
                        {selected.client_industry && <p className="text-[10px] text-muted-foreground">{selected.client_industry}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", HEALTH_CONFIG[selected.relationship_health].dot)} />
                      <span className={cn("text-xs font-medium", HEALTH_CONFIG[selected.relationship_health].color)}>
                        {HEALTH_CONFIG[selected.relationship_health].label}
                      </span>
                      {selected.sentiment && (
                        <span className={cn("text-[10px]", SENTIMENT_CONFIG[selected.sentiment].color)}>
                          {SENTIMENT_CONFIG[selected.sentiment].label}
                        </span>
                      )}
                    </div>
                    {clientInsight && (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded border p-1.5"><p className="text-lg font-bold tabular-nums">{clientInsight.summary.active_projects}</p><p className="text-[9px] text-muted-foreground">Projects</p></div>
                        <div className="rounded border p-1.5"><p className="text-lg font-bold tabular-nums">{clientInsight.summary.total_open_tasks}</p><p className="text-[9px] text-muted-foreground">Open Tasks</p></div>
                        <div className="rounded border p-1.5"><p className="text-lg font-bold tabular-nums">{clientInsight.summary.total_contacts}</p><p className="text-[9px] text-muted-foreground">Contacts</p></div>
                      </div>
                    )}
                    {selected.client_id && (
                      <Link href={`/clients/${selected.client_id}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="size-3" /> Open full profile
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <AlertTriangle className="mx-auto mb-1 size-5 text-amber-500" />
                    <p className="text-xs font-medium text-amber-600">Unlinked Thread</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground text-pretty">This conversation isn't linked to a client yet.</p>
                    <Button variant="outline" size="sm" className="mt-2 h-7 text-xs"><Link2 className="mr-1 size-3" /> Link to Client</Button>
                  </div>
                )}
              </div>

              {/* AI Summary */}
              {selected.ai_summary && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2 flex items-center gap-1"><Zap className="size-3" /> AI Summary</p>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground text-pretty leading-relaxed">{selected.ai_summary}</p>
                  </div>
                </div>
              )}

              {/* Open Asks */}
              {selected.extracted_asks.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2 flex items-center gap-1"><Target className="size-3" /> Open Asks</p>
                  <ul className="space-y-1.5">
                    {selected.extracted_asks.map((ask, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <CircleDot className={cn("size-3 shrink-0 mt-0.5", ask.resolved ? "text-emerald-500" : "text-amber-500")} />
                        <span className={ask.resolved ? "line-through" : ""}>{ask.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Decisions */}
              {selected.extracted_decisions.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Decisions</p>
                  <ul className="space-y-1.5">
                    {selected.extracted_decisions.map((d, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <ThumbsUp className="size-3 shrink-0 mt-0.5 text-emerald-500" />
                        <span>{d.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Deadlines */}
              {selected.extracted_deadlines.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2 flex items-center gap-1"><CalendarClock className="size-3" /> Deadlines</p>
                  <ul className="space-y-1.5">
                    {selected.extracted_deadlines.map((dl, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <Clock className="size-3 shrink-0 mt-0.5 text-red-500" />
                        <span>{dl.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risks */}
              {(selected.relationship_health === "at_risk" || selected.sentiment === "urgent" || selected.sentiment === "frustrated") && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-red-500 mb-2 flex items-center gap-1"><AlertTriangle className="size-3" /> Risks</p>
                  <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-3">
                    <p className="text-xs text-red-700 dark:text-red-300 text-pretty">
                      {selected.relationship_health === "at_risk" ? "This client relationship is at risk. " : ""}
                      {selected.sentiment === "urgent" ? "Client communication has urgent tone. " : ""}
                      {selected.sentiment === "frustrated" ? "Client appears frustrated. Prioritize response. " : ""}
                      {selected.follow_up_at ? `Follow-up due ${formatDistanceToNow(new Date(selected.follow_up_at), { addSuffix: true })}.` : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Recommended Actions */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2 flex items-center gap-1"><Zap className="size-3" /> Actions</p>
                <div className="grid grid-cols-1 gap-1.5">
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs"><ListPlus className="mr-1.5 size-3.5" /> Create Task</Button>
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs"><ArrowUpRight className="mr-1.5 size-3.5" /> Create Project</Button>
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs"><Bookmark className="mr-1.5 size-3.5" /> Save Fact to Client</Button>
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs"><UserPlus className="mr-1.5 size-3.5" /> Add Contact</Button>
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs"><CalendarClock className="mr-1.5 size-3.5" /> Set Follow-up</Button>
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs"><CheckCircle2 className="mr-1.5 size-3.5" /> Mark Resolved</Button>
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs"><Copy className="mr-1.5 size-3.5" /> Copy Source Link</Button>
                </div>
              </div>

              {/* Linked Work */}
              {clientInsight && clientInsight.active_projects.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Active Projects</p>
                  <div className="space-y-1">
                    {clientInsight.active_projects.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 rounded border p-2 text-xs">
                        <CircleDot className="size-3 text-emerald-500 shrink-0" />
                        <span className="truncate font-medium">{p.name}</span>
                        <Badge variant="outline" className="text-[9px] ml-auto">{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {clientInsight && clientInsight.open_tasks.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Open Tasks ({clientInsight.open_tasks.length})</p>
                  <div className="space-y-1">
                    {clientInsight.open_tasks.slice(0, 5).map((t) => (
                      <div key={t.id} className="flex items-center gap-2 rounded border p-2 text-xs">
                        <span className={cn("size-1.5 rounded-full shrink-0",
                          t.priority === "urgent" ? "bg-red-500" : t.priority === "high" ? "bg-amber-500" : "bg-gray-400"
                        )} />
                        <span className="truncate">{t.title}</span>
                        <Badge variant="outline" className="text-[9px] ml-auto">{t.column}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Intelligence */}
              {clientInsight && clientInsight.facts.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Client Intelligence</p>
                  <div className="space-y-1">
                    {clientInsight.facts.slice(0, 6).map((f) => (
                      <div key={f.id} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                        <span className="text-muted-foreground">{(f.key as string).replace(/_/g, " ")}</span>
                        <span className="font-medium truncate max-w-[120px]">{f.value as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
            <div>
              <Building2 className="mx-auto mb-2 size-8" />
              <p className="text-xs text-pretty">Select a thread to see client context, insights, linked work, and actions.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
