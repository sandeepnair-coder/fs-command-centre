"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Briefcase,
  Clock,
  Hash,
  Lightbulb,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { askOpenClaw } from "@/app/(app)/command-centre/actions";
import type {
  CriticalItem,
  PotentialClient,
  OpportunityInsight,
  SnapshotMetrics,
  RecentComm,
} from "@/app/(app)/command-centre/actions";

// ─── Props ──────────────────────────────────────────────────────────────────

type Props = {
  metrics: SnapshotMetrics;
  criticalItems: CriticalItem[];
  potentialClients: PotentialClient[];
  opportunities: OpportunityInsight[];
  recentComms: RecentComm[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const CHANNEL_ICON: Record<string, typeof Mail> = {
  email: Mail,
  slack: Hash,
  whatsapp: Phone,
};

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
};

const ITEM_TYPE_LABEL: Record<string, string> = {
  overdue: "Overdue",
  urgent: "Urgent",
  stale_client: "Stale",
  needs_reply: "Needs reply",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function CommandCentreShell({
  metrics,
  criticalItems,
  potentialClients,
  opportunities,
  recentComms,
}: Props) {
  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* Left: Main content */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 pr-4 pb-8">
          <MetricsRow metrics={metrics} />
          <CriticalItemsFeed items={criticalItems} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PotentialClientsCard clients={potentialClients} />
            <OpportunitiesCard opportunities={opportunities} />
          </div>
          <RecentCommsCard comms={recentComms} />
        </div>
      </ScrollArea>

      {/* Right: Ask OpenClaw */}
      <div className="hidden w-80 shrink-0 lg:block">
        <AskOpenClawPanel />
      </div>
    </div>
  );
}

// ─── Metrics Row ────────────────────────────────────────────────────────────

function MetricsRow({ metrics }: { metrics: SnapshotMetrics }) {
  const cards = [
    { label: "Active Tasks", value: metrics.activeTasks, href: "/tasks", icon: Briefcase },
    { label: "Overdue", value: metrics.overdueTasks, href: "/tasks", icon: AlertTriangle, alert: metrics.overdueTasks > 0 },
    { label: "Clients", value: metrics.totalClients, href: "/clients", icon: Users },
    { label: "Needs Reply", value: metrics.needsReply, href: "/comms", icon: MessageSquare, alert: metrics.needsReply > 0 },
    { label: "Opportunities", value: metrics.opportunities, href: "/settings/integrations/slack-insights", icon: Lightbulb },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <Link key={c.label} href={c.href}>
          <Card className={`transition-colors hover:bg-muted/50 ${c.alert ? "border-destructive/50" : ""}`}>
            <CardContent className="flex items-center gap-3 p-4">
              <c.icon className={`size-5 shrink-0 ${c.alert ? "text-destructive" : "text-muted-foreground"}`} />
              <div className="min-w-0">
                <p className={`text-2xl font-bold tabular-nums ${c.alert ? "text-destructive" : ""}`}>{c.value}</p>
                <p className="truncate text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ─── Critical Items Feed ────────────────────────────────────────────────────

function CriticalItemsFeed({ items }: { items: CriticalItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4" />
            Critical Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nothing critical right now. Either you&apos;re crushing it, or something&apos;s very wrong.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4" />
            Critical Items
            <Badge variant="secondary" className="tabular-nums">{items.length}</Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 p-4 pt-0">
        {items.map((item) => (
          <Link
            key={`${item.type}-${item.id}`}
            href={item.href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/60"
          >
            <Badge className={`shrink-0 text-xs ${PRIORITY_STYLE[item.priority]}`}>
              {ITEM_TYPE_LABEL[item.type]}
            </Badge>
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            {item.client_name && (
              <span className="shrink-0 text-xs text-muted-foreground">{item.client_name}</span>
            )}
            {item.subtitle && (
              <span className="shrink-0 text-xs text-muted-foreground">{item.subtitle}</span>
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Potential Clients ──────────────────────────────────────────────────────

function PotentialClientsCard({ clients }: { clients: PotentialClient[] }) {
  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Potential Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No unlinked conversations. Every thread has a home.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Potential Clients
            <Badge variant="secondary" className="tabular-nums">{clients.length}</Badge>
          </CardTitle>
          <Link href="/comms">
            <Button variant="ghost" size="sm" className="text-xs">
              View in Comms <ArrowRight className="ml-1 size-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {clients.slice(0, 5).map((c) => {
          const ChannelIcon = CHANNEL_ICON[c.channel] || MessageSquare;
          return (
            <Link
              key={c.conversation_id}
              href="/comms"
              className="flex items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/60"
            >
              <ChannelIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.subject || "Untitled"}</p>
                {c.ai_summary && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.ai_summary}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(c.last_message_at)}</span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── AI Opportunities ───────────────────────────────────────────────────────

function OpportunitiesCard({ opportunities }: { opportunities: OpportunityInsight[] }) {
  if (opportunities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4" />
            AI Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No opportunities detected yet. Tessa is watching your Slack channels.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4" />
            AI Opportunities
            <Badge variant="secondary" className="tabular-nums">{opportunities.length}</Badge>
          </CardTitle>
          <Link href="/settings/integrations/slack-insights">
            <Button variant="ghost" size="sm" className="text-xs">
              All insights <ArrowRight className="ml-1 size-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {opportunities.slice(0, 5).map((opp) => (
          <Link
            key={opp.id}
            href="/settings/integrations/slack-insights"
            className="flex items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/60"
          >
            <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{opp.recommended_service || "Insight"}</p>
                {opp.confidence_score != null && (
                  <Badge variant="outline" className="shrink-0 text-xs tabular-nums">
                    {Math.round(opp.confidence_score * 100)}%
                  </Badge>
                )}
              </div>
              {opp.summary && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{opp.summary}</p>
              )}
            </div>
            {opp.channel_name && (
              <span className="shrink-0 text-xs text-muted-foreground">#{opp.channel_name}</span>
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Recent Comms ───────────────────────────────────────────────────────────

function RecentCommsCard({ comms }: { comms: RecentComm[] }) {
  if (comms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4" />
            Recent Comms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All quiet on the comms front. Connect your channels to see conversations flow in.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4" />
            Recent Comms
          </CardTitle>
          <Link href="/comms">
            <Button variant="ghost" size="sm" className="text-xs">
              Open Comms <ArrowRight className="ml-1 size-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-1">
          {comms.map((c) => {
            const ChannelIcon = CHANNEL_ICON[c.channel] || MessageSquare;
            return (
              <Link
                key={c.id}
                href="/comms"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/60"
              >
                <ChannelIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{c.subject || "Untitled"}</span>
                {c.client_name && (
                  <span className="shrink-0 text-xs text-muted-foreground">{c.client_name}</span>
                )}
                {c.sentiment === "frustrated" && (
                  <Badge className="shrink-0 bg-red-100 text-xs text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    Frustrated
                  </Badge>
                )}
                {c.status === "waiting_on_us" && (
                  <Badge className="shrink-0 bg-orange-100 text-xs text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                    Needs reply
                  </Badge>
                )}
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{timeAgo(c.last_message_at)}</span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Ask OpenClaw Panel ─────────────────────────────────────────────────────

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function AskOpenClawPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const response = await askOpenClaw(question);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Couldn't reach Tessa right now. Try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-4" />
          Ask Tessa
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ask about projects, clients, deadlines, or workload.
        </p>
      </CardHeader>
      <Separator />
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bot className="size-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              Ask me anything about your projects.
            </p>
            <div className="mt-4 space-y-1.5">
              {[
                "What's overdue right now?",
                "Which clients need attention?",
                "Summarise this week's activity",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                  }}
                  className="block w-full rounded-md border px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="space-y-2 rounded-lg bg-muted px-3 py-2">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="shrink-0 border-t p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Tessa..."
            className="flex-1 text-sm"
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || loading}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
