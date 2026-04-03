"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getConversations, getMessages } from "@/app/(app)/comms/actions";
import type { Conversation, CommsMessage, ChannelType, MessageClassification } from "@/lib/types/comms";
import { CHANNEL_CONFIG, CLASSIFICATION_CONFIG } from "@/lib/types/comms";
import { format, formatDistanceToNow } from "date-fns";

type ChannelTab = "all" | ChannelType;

const CHANNEL_TABS: { value: ChannelTab; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Inbox },
  { value: "email", label: "Email", icon: Mail },
  { value: "slack", label: "Slack", icon: Hash },
  { value: "whatsapp", label: "WhatsApp", icon: Phone },
];

// ─── Placeholder conversations for demo ──────────────────────────────────────

const DEMO_CONVERSATIONS: (Conversation & { client_name: string | null })[] = [
  {
    id: "demo-1",
    channel: "email",
    external_thread_id: "thread-001",
    client_id: null,
    project_id: null,
    subject: "Website redesign — final feedback",
    last_message_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    participants: ["priya@greenleaf.co", "design@fyndstudio.com"],
    is_resolved: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    client_name: "GreenLeaf Organics",
    message_count: 8,
    unread_count: 2,
  },
  {
    id: "demo-2",
    channel: "slack",
    external_thread_id: "thread-002",
    client_id: null,
    project_id: null,
    subject: "Logo variations — round 2",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    participants: ["#project-bluewave", "arun", "neha"],
    is_resolved: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    client_name: "BlueWave Tech",
    message_count: 14,
    unread_count: 0,
  },
  {
    id: "demo-3",
    channel: "whatsapp",
    external_thread_id: "thread-003",
    client_id: null,
    project_id: null,
    subject: "Diwali campaign — urgent changes",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    participants: ["+91 98765 43210", "Rahul (Spice Junction)"],
    is_resolved: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    client_name: "Spice Junction",
    message_count: 6,
    unread_count: 3,
  },
  {
    id: "demo-4",
    channel: "email",
    external_thread_id: "thread-004",
    client_id: null,
    project_id: null,
    subject: "Invoice Q3 — approved",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    participants: ["accounts@urbancraft.in", "billing@fyndstudio.com"],
    is_resolved: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    client_name: "UrbanCraft Studios",
    message_count: 3,
    unread_count: 0,
  },
  {
    id: "demo-5",
    channel: "slack",
    external_thread_id: "thread-005",
    client_id: null,
    project_id: null,
    subject: "Brand guidelines review",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    participants: ["#greenleaf-brand", "priya", "meera"],
    is_resolved: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    client_name: "GreenLeaf Organics",
    message_count: 22,
    unread_count: 0,
  },
];

const DEMO_MESSAGES: Record<string, CommsMessage[]> = {
  "demo-1": [
    { id: "m1", conversation_id: "demo-1", channel: "email", client_id: null, project_id: null, sender_display_name: "Priya Sharma", sender_identifier: "priya@greenleaf.co", body_text: "Hi team, the homepage looks great! Two small things:\n\n1. Can we make the hero image larger?\n2. The CTA button colour should match our brand green (#2D7F3A)\n\nOtherwise approved to go live.", classification: "approval", has_attachments: false, source_url: null, created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
    { id: "m2", conversation_id: "demo-1", channel: "email", client_id: null, project_id: null, sender_display_name: "Neha (Fynd Studio)", sender_identifier: "neha@fyndstudio.com", body_text: "Thanks Priya! Hero image enlarged and CTA updated to #2D7F3A. Preview link coming in 30 mins.", classification: "general", has_attachments: false, source_url: null, created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: "m3", conversation_id: "demo-1", channel: "email", client_id: null, project_id: null, sender_display_name: "Priya Sharma", sender_identifier: "priya@greenleaf.co", body_text: "Perfect. Also, can we add a testimonial section below the fold? Rahul from marketing will send the quotes by tomorrow.", classification: "task_candidate", has_attachments: false, source_url: null, created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  ],
  "demo-2": [
    { id: "m4", conversation_id: "demo-2", channel: "slack", client_id: null, project_id: null, sender_display_name: "Arun", sender_identifier: "arun", body_text: "Uploaded the 3 logo options to the shared drive. Let me know which direction works.", classification: "general", has_attachments: true, source_url: null, created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
    { id: "m5", conversation_id: "demo-2", channel: "slack", client_id: null, project_id: null, sender_display_name: "Neha", sender_identifier: "neha", body_text: "Option B feels strongest. The wave element is clean. @arun can you do a version with the tagline underneath?", classification: "decision", has_attachments: false, source_url: null, created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  ],
  "demo-3": [
    { id: "m6", conversation_id: "demo-3", channel: "whatsapp", client_id: null, project_id: null, sender_display_name: "Rahul (Spice Junction)", sender_identifier: "+919876543210", body_text: "The Diwali poster needs a last-minute change. Can we swap the background to gold instead of red? The festival theme shifted.", classification: "task_candidate", has_attachments: false, source_url: null, created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() },
    { id: "m7", conversation_id: "demo-3", channel: "whatsapp", client_id: null, project_id: null, sender_display_name: "Meera (Fynd Studio)", sender_identifier: "+919988776655", body_text: "On it! Will send the updated version by EOD. Any other changes to the copy?", classification: "general", has_attachments: false, source_url: null, created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
    { id: "m8", conversation_id: "demo-3", channel: "whatsapp", client_id: null, project_id: null, sender_display_name: "Rahul (Spice Junction)", sender_identifier: "+919876543210", body_text: "Copy is fine. Just the background. Also need this for Instagram Stories format — 1080x1920. Deadline is tomorrow morning.", classification: "blocker", has_attachments: false, source_url: null, created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  ],
};

// ─── Channel Icon ────────────────────────────────────────────────────────────

function ChannelIcon({ channel, className }: { channel: ChannelType; className?: string }) {
  switch (channel) {
    case "email": return <Mail className={className} />;
    case "slack": return <Hash className={className} />;
    case "whatsapp": return <Phone className={className} />;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CommsShell() {
  const [activeTab, setActiveTab] = useState<ChannelTab>("all");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<(Conversation & { client_name: string | null })[]>(DEMO_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommsMessage[]>([]);

  // Try to load real data, fall back to demo
  useEffect(() => {
    getConversations()
      .then((data) => {
        if (data.length > 0) setConversations(data);
      })
      .catch(() => {});
  }, []);

  // Filter conversations
  const filtered = conversations.filter((c) => {
    if (activeTab !== "all" && c.channel !== activeTab) return false;
    if (search && !c.subject?.toLowerCase().includes(search.toLowerCase()) && !c.client_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Load messages when selecting
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    // Use demo messages or fetch real
    if (DEMO_MESSAGES[id]) {
      setMessages(DEMO_MESSAGES[id]);
    } else {
      getMessages(id).then(setMessages).catch(() => setMessages([]));
    }
  }, []);

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-full overflow-hidden rounded-lg border bg-card">
      {/* ─── LEFT: Thread List ─── */}
      <div className="flex w-80 shrink-0 flex-col border-r">
        {/* Tabs */}
        <div className="border-b px-3 pt-3 pb-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ChannelTab)}>
            <TabsList className="w-full">
              {CHANNEL_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex-1 gap-1 text-xs">
                  <tab.icon className="size-3" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Search */}
        <div className="border-b px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search threads..."
              className="h-8 pl-8 text-sm"
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
        </div>

        {/* Thread list */}
        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Inbox className="mb-2 size-8" />
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="mt-1 text-xs">Threads will appear here once channels are connected.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => handleSelect(convo.id)}
                  className={cn(
                    "w-full px-3 py-3 text-left transition-colors hover:bg-muted/50",
                    selectedId === convo.id && "bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={convo.channel} className="size-3.5 shrink-0 text-muted-foreground" />
                    {convo.client_name && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">
                        {convo.client_name}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                      {formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium truncate">{convo.subject || "(No subject)"}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {(convo.unread_count ?? 0) > 0 && (
                      <Badge className="h-4 px-1.5 text-[10px] bg-primary text-primary-foreground">{convo.unread_count}</Badge>
                    )}
                    {convo.is_resolved && (
                      <CheckCircle2 className="size-3 text-emerald-500" />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {convo.participants.slice(0, 2).join(", ")}
                      {convo.participants.length > 2 && ` +${convo.participants.length - 2}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ─── CENTER: Message Timeline ─── */}
      <div className="flex flex-1 flex-col min-w-0">
        {selected ? (
          <>
            {/* Thread header */}
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <ChannelIcon channel={selected.channel} className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold truncate text-balance">{selected.subject || "(No subject)"}</h2>
                {selected.is_resolved && (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Resolved</Badge>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                {selected.client_name && <span className="font-medium">{selected.client_name}</span>}
                <span>{selected.participants.length} participants</span>
                <span className="tabular-nums">Last activity {formatDistanceToNow(new Date(selected.last_message_at), { addSuffix: true })}</span>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="rounded-lg border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{msg.sender_display_name || "Unknown"}</span>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", CHANNEL_CONFIG[msg.channel].color)}>
                        {CHANNEL_CONFIG[msg.channel].label}
                      </Badge>
                      {msg.classification && msg.classification !== "general" && (
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 h-4", CLASSIFICATION_CONFIG[msg.classification].color)}>
                          {CLASSIFICATION_CONFIG[msg.classification].label}
                        </Badge>
                      )}
                      {msg.has_attachments && <Paperclip className="size-3 text-muted-foreground" />}
                      <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                        {format(new Date(msg.created_at), "d MMM, h:mm a")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap text-pretty leading-relaxed">
                      {msg.body_text}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="mb-2 size-10" />
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="mt-1 text-xs">Pick a thread from the left to see the full timeline.</p>
          </div>
        )}
      </div>

      {/* ─── RIGHT: Insight Panel ─── */}
      <div className="w-72 shrink-0 border-l">
        {selected ? (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Summary */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Summary</p>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground text-pretty leading-relaxed">
                    {selected.id === "demo-1"
                      ? "Client approved homepage with 2 minor changes (hero size, CTA color). New request for testimonial section — potential task."
                      : selected.id === "demo-2"
                        ? "Logo exploration round 2. Team is leaning towards Option B. Awaiting version with tagline."
                        : selected.id === "demo-3"
                          ? "Urgent: Diwali poster background change from red to gold. Need Instagram Stories format (1080x1920). Deadline: tomorrow morning."
                          : "Thread summary will appear here once AI processing is enabled via Settings > Connectors."}
                  </p>
                </div>
              </div>

              {/* Open Asks */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Open Asks</p>
                {selected.id === "demo-1" ? (
                  <ul className="space-y-1.5">
                    <li className="text-xs text-muted-foreground flex gap-1.5">
                      <Flag className="size-3 shrink-0 mt-0.5 text-amber-500" />
                      <span>Add testimonial section below the fold</span>
                    </li>
                    <li className="text-xs text-muted-foreground flex gap-1.5">
                      <Flag className="size-3 shrink-0 mt-0.5 text-blue-500" />
                      <span>Waiting for quotes from Rahul (marketing)</span>
                    </li>
                  </ul>
                ) : selected.id === "demo-3" ? (
                  <ul className="space-y-1.5">
                    <li className="text-xs text-muted-foreground flex gap-1.5">
                      <Flag className="size-3 shrink-0 mt-0.5 text-red-500" />
                      <span>Change poster background to gold</span>
                    </li>
                    <li className="text-xs text-muted-foreground flex gap-1.5">
                      <Flag className="size-3 shrink-0 mt-0.5 text-red-500" />
                      <span>Create Instagram Stories version (1080x1920)</span>
                    </li>
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground/60 italic">No open asks detected.</p>
                )}
              </div>

              {/* Decisions */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Decisions</p>
                {selected.id === "demo-2" ? (
                  <ul className="space-y-1.5">
                    <li className="text-xs text-muted-foreground flex gap-1.5">
                      <ThumbsUp className="size-3 shrink-0 mt-0.5 text-emerald-500" />
                      <span>Option B selected for logo direction</span>
                    </li>
                  </ul>
                ) : selected.id === "demo-1" ? (
                  <ul className="space-y-1.5">
                    <li className="text-xs text-muted-foreground flex gap-1.5">
                      <ThumbsUp className="size-3 shrink-0 mt-0.5 text-emerald-500" />
                      <span>Homepage approved with minor changes</span>
                    </li>
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground/60 italic">No decisions recorded.</p>
                )}
              </div>

              {/* Actions */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Actions</p>
                <div className="grid grid-cols-1 gap-1.5">
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs">
                    <ListPlus className="mr-1.5 size-3.5" /> Create Task
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs">
                    <Bookmark className="mr-1.5 size-3.5" /> Save Fact to Client
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs">
                    <ThumbsUp className="mr-1.5 size-3.5" /> Mark as Approval
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs">
                    <CheckCircle2 className="mr-1.5 size-3.5" /> Mark Resolved
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs">
                    <Copy className="mr-1.5 size-3.5" /> Copy Source Link
                  </Button>
                </div>
              </div>

              {/* Related Tasks */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Related Tasks</p>
                <p className="text-xs text-muted-foreground/60 italic">
                  No linked tasks yet. Create one from the actions above.
                </p>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
            <p className="text-xs">Select a thread to see insights, related tasks, and actions.</p>
          </div>
        )}
      </div>
    </div>
  );
}
