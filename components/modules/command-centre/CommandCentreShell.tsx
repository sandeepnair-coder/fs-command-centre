"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Lightbulb,
  ListChecks,
  MessageSquare,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { askOpenClaw } from "@/app/(app)/command-centre/actions";
import type {
  CriticalItem,
  SnapshotMetrics,
  DashboardData,
  DeliveryHealth,
  TeamWorkloadItem,
  ClientRiskItem,
  BottleneckItem,
} from "@/app/(app)/command-centre/actions";

type Props = {
  dashboardData: DashboardData;
  metrics: SnapshotMetrics;
};

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
};
const ITEM_TYPE_LABEL: Record<string, string> = { overdue: "Overdue", urgent: "Urgent", needs_reply: "Needs reply", stale_client: "Stale" };

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SHELL
// ═══════════════════════════════════════════════════════════════════════════

export function CommandCentreShell({ dashboardData, metrics }: Props) {
  const { deliveryHealth, teamWorkload, clientRisk, bottlenecks, criticalItems } = dashboardData;

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="space-y-5 pr-4 pb-8">
          {/* Row 1: Attention Cards */}
          <AttentionCards health={deliveryHealth} needsReply={metrics.needsReply} />

          {/* Row 2: Delivery Health */}
          <DeliveryHealthSection health={deliveryHealth} />

          {/* Row 3: Two-column — Team + Clients */}
          <div className="grid gap-4 lg:grid-cols-2">
            <TeamWorkloadSection workload={teamWorkload} />
            <ClientRiskSection clients={clientRisk} />
          </div>

          {/* Row 4: Bottlenecks */}
          <BottleneckSection bottlenecks={bottlenecks} />

          {/* Row 5: Tessa Insights + Quick Actions */}
          <div className="grid gap-4 lg:grid-cols-2">
            <TessaInsights data={dashboardData} />
            <QuickActions />
          </div>

          {/* Row 6: Critical Items */}
          <CriticalItemsFeed items={criticalItems} />
        </div>
      </ScrollArea>

      {/* Right: Ask Tessa */}
      <div className="hidden w-80 shrink-0 lg:block">
        <AskTessaPanel data={dashboardData} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ATTENTION CARDS
// ═══════════════════════════════════════════════════════════════════════════

function AttentionCards({ health, needsReply }: { health: DeliveryHealth; needsReply: number }) {
  const cards = [
    { label: "Overdue", value: health.overdue, icon: AlertTriangle, alert: health.overdue > 0, href: "/tasks?dueDate=overdue" },
    { label: "Urgent", value: health.urgent, icon: Flame, alert: health.urgent > 0, href: "/tasks?priority=urgent" },
    { label: "In Review", value: health.inReview, icon: Clock, alert: false, href: "/tasks?search=review" },
    { label: "Needs Reply", value: needsReply, icon: MessageSquare, alert: needsReply > 0, href: "/comms" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => (
        <Link key={c.label} href={c.href}>
          <Card className={cn("transition-colors hover:bg-muted/50", c.alert && "border-destructive/60 bg-destructive/5")}>
            <CardContent className="flex items-center gap-3 p-4">
              <c.icon className={cn("size-5 shrink-0", c.alert ? "text-destructive" : "text-muted-foreground")} />
              <div>
                <p className={cn("text-2xl font-bold tabular-nums", c.alert && "text-destructive")}>{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. DELIVERY HEALTH
// ═══════════════════════════════════════════════════════════════════════════

const HEALTH_CONFIG = {
  excellent: { color: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", label: "Excellent", Icon: CheckCircle2 },
  good: { color: "bg-primary", text: "text-primary", label: "On Track", Icon: TrendingUp },
  warning: { color: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", label: "At Risk", Icon: AlertTriangle },
  critical: { color: "bg-destructive", text: "text-destructive", label: "Critical", Icon: XCircle },
};

function DeliveryHealthSection({ health }: { health: DeliveryHealth }) {
  const cfg = HEALTH_CONFIG[health.healthStatus];

  const metrics = [
    { label: "Total", value: health.total, icon: ListChecks },
    { label: "Completed", value: health.completed, icon: CheckCircle2, positive: true },
    { label: "In Progress", value: health.inProgress, icon: Activity },
    { label: "Pending", value: health.pending, icon: Clock },
    { label: "Overdue", value: health.overdue, icon: AlertTriangle, alert: health.overdue > 0 },
    { label: "In Review", value: health.inReview, icon: ExternalLink },
  ];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {/* Health badge */}
          <div className="flex items-center gap-3">
            <div className={cn("flex size-12 items-center justify-center rounded-full", cfg.color)}>
              <cfg.Icon className="size-6 text-white" />
            </div>
            <div>
              <p className={cn("text-lg font-bold", cfg.text)}>{cfg.label}</p>
              <p className="text-xs text-muted-foreground">Delivery Health</p>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden h-10 sm:block" />

          {/* Completion bar */}
          <div className="flex-1 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">{health.completionRate}% completed</span>
              <span className="text-xs text-muted-foreground">{health.completed}/{health.total} tasks</span>
            </div>
            <Progress value={health.completionRate} className="h-2" />
          </div>
        </div>

        {/* Metrics grid */}
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg border p-3 text-center">
              <p className={cn("text-xl font-bold tabular-nums", m.alert && "text-destructive", m.positive && "text-emerald-600 dark:text-emerald-400")}>
                {m.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. TEAM WORKLOAD
// ═══════════════════════════════════════════════════════════════════════════

function TeamWorkloadSection({ workload }: { workload: TeamWorkloadItem[] }) {
  if (workload.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="size-4" />Team Workload</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground py-4 text-center">No assigned tasks yet.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Users className="size-4" />Team Workload</CardTitle>
          <Badge variant="secondary" className="text-xs">{workload.length} members</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 p-4 pt-0">
        {workload.slice(0, 8).map((m) => {
          const overloaded = m.overdue >= 3 || m.totalTasks >= 8;
          return (
            <div key={m.userId} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50">
              <div className={cn("flex size-8 items-center justify-center rounded-full text-xs font-bold text-white", overloaded ? "bg-destructive" : "bg-primary")}>
                {m.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <div className="flex gap-2 text-[11px] text-muted-foreground">
                  <span>{m.totalTasks} tasks</span>
                  {m.overdue > 0 && <span className="font-medium text-destructive">{m.overdue} overdue</span>}
                  {m.urgent > 0 && <span className="font-medium text-amber-600">{m.urgent} urgent</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium tabular-nums">{m.avgAgingDays}d</p>
                <p className="text-[11px] text-muted-foreground">avg age</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. CLIENT RISK
// ═══════════════════════════════════════════════════════════════════════════

const RISK_BADGE: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-500 text-white hover:bg-red-500" },
  high: { label: "High", className: "bg-orange-500 text-white hover:bg-orange-500" },
  medium: { label: "Watch", className: "bg-amber-500 text-white hover:bg-amber-500" },
  low: { label: "Healthy", className: "bg-emerald-500 text-white hover:bg-emerald-500" },
};

function ClientRiskSection({ clients }: { clients: ClientRiskItem[] }) {
  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertCircle className="size-4" />Client Risk</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground py-4 text-center">No client-linked tasks yet.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><AlertCircle className="size-4" />Client Risk</CardTitle>
          <Link href="/clients"><Button variant="ghost" size="sm" className="h-7 text-xs">View All <ArrowRight className="ml-1 size-3" /></Button></Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 p-4 pt-0">
        {clients.slice(0, 8).map((c) => {
          const rb = RISK_BADGE[c.riskLevel];
          return (
            <div key={c.clientId} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <Badge className={cn("shrink-0 text-[10px]", rb.className)}>{rb.label}</Badge>
                </div>
                <div className="flex gap-2 text-[11px] text-muted-foreground">
                  <span>{c.totalTasks} tasks</span>
                  {c.overdue > 0 && <span className="font-medium text-destructive">{c.overdue} overdue</span>}
                  {c.inReview > 0 && <span>{c.inReview} in review</span>}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. BOTTLENECKS
// ═══════════════════════════════════════════════════════════════════════════

function BottleneckSection({ bottlenecks }: { bottlenecks: BottleneckItem[] }) {
  if (bottlenecks.length === 0) return null;

  const maxCount = Math.max(...bottlenecks.map(b => b.taskCount), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-4" />Workflow Stages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {bottlenecks.map((b) => {
          const pct = Math.round((b.taskCount / maxCount) * 100);
          const isHot = b.avgAgingDays > 14 || b.taskCount >= 8;
          return (
            <div key={b.columnId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{b.stageName}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium tabular-nums">{b.taskCount}</span> tasks
                  <span className={cn("tabular-nums", isHot && "font-medium text-amber-600")}>{b.avgAgingDays}d avg</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full transition-all", isHot ? "bg-amber-500" : "bg-primary/60")} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. TESSA INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════

function TessaInsights({ data }: { data: DashboardData }) {
  const insights: string[] = [];
  const { deliveryHealth: dh, teamWorkload: tw, clientRisk: cr, bottlenecks: bn } = data;

  if (dh.overdue > 0) insights.push(`**${dh.overdue} tasks** are overdue. ${dh.overdue > 5 ? "This needs immediate attention." : "Keep an eye on deadlines."}`);

  const overloadedMembers = tw.filter(m => m.overdue >= 3);
  if (overloadedMembers.length > 0) insights.push(`**${overloadedMembers.map(m => m.name).join(", ")}** ${overloadedMembers.length === 1 ? "has" : "have"} the highest overdue load. Consider reassigning.`);

  const criticalClients = cr.filter(c => c.riskLevel === "critical" || c.riskLevel === "high");
  if (criticalClients.length > 0) insights.push(`**${criticalClients.map(c => c.name).join(", ")}** ${criticalClients.length === 1 ? "is" : "are"} at risk due to overdue delivery.`);

  const topBottleneck = bn.sort((a, b) => b.avgAgingDays - a.avgAgingDays)[0];
  if (topBottleneck && topBottleneck.avgAgingDays > 10) insights.push(`**${topBottleneck.stageName}** is a bottleneck — ${topBottleneck.taskCount} tasks aging ${topBottleneck.avgAgingDays} days on average.`);

  if (dh.inReview > 3) insights.push(`**${dh.inReview} tasks** are stuck in client review. Follow up on pending approvals.`);

  if (dh.healthStatus === "excellent") insights.push("All systems green — delivery health is **excellent**. Keep it up!");

  if (insights.length === 0) insights.push("Operations look stable. No major risks detected today.");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-amber-500" />Tessa&apos;s Observations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 p-4 pt-0">
        {insights.map((insight, i) => (
          <div key={i} className="flex gap-2 text-sm">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <span dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. QUICK ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

function QuickActions() {
  const actions = [
    { label: "View Overdue", icon: AlertTriangle, href: "/tasks?dueDate=overdue" },
    { label: "Client Review", icon: ExternalLink, href: "/tasks?search=review" },
    { label: "Open Comms", icon: MessageSquare, href: "/comms" },
    { label: "Clients", icon: Users, href: "/clients" },
    { label: "Finance", icon: TrendingUp, href: "/finance" },
    { label: "Task Board", icon: ListChecks, href: "/tasks" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <Link key={a.label} href={a.href}>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
                <a.icon className="size-3.5" />
                {a.label}
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. CRITICAL ITEMS
// ═══════════════════════════════════════════════════════════════════════════

function CriticalItemsFeed({ items }: { items: CriticalItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="size-4" />Critical Items</CardTitle></CardHeader>
        <CardContent><p className="py-4 text-center text-sm text-muted-foreground">Nothing critical. All clear!</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4" />
          Critical Items
          <Badge variant="secondary" className="tabular-nums">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-4 pt-0">
        {items.map((item) => (
          <Link key={`${item.type}-${item.id}`} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/60">
            <Badge className={cn("shrink-0 text-xs", PRIORITY_STYLE[item.priority])}>{ITEM_TYPE_LABEL[item.type]}</Badge>
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            {item.client_name && <span className="shrink-0 text-xs text-muted-foreground">{item.client_name}</span>}
            {item.subtitle && <span className="shrink-0 text-xs text-muted-foreground">{item.subtitle}</span>}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. ASK TESSA PANEL
// ═══════════════════════════════════════════════════════════════════════════

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={`ul-${elements.length}`} className="ml-4 list-disc space-y-0.5">{listItems}</ul>);
      listItems = [];
    }
  };

  const inlineBold = (line: string, key: string): React.ReactNode => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, j) => part.startsWith("**") && part.endsWith("**") ? <strong key={`${key}-${j}`}>{part.slice(2, -2)}</strong> : part);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      listItems.push(<li key={`li-${i}`}>{inlineBold(bulletMatch[1], `li-${i}`)}</li>);
    } else {
      flushList();
      if (line.trim() === "") { if (i > 0 && i < lines.length - 1) elements.push(<div key={`br-${i}`} className="h-2" />); }
      else elements.push(<p key={`p-${i}`}>{inlineBold(line, `p-${i}`)}</p>);
    }
  }
  flushList();
  return <div className="space-y-1">{elements}</div>;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

function AskTessaPanel({ data }: { data: DashboardData }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

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
      setMessages((prev) => [...prev, { role: "assistant", content: "Couldn't reach Tessa right now. Try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  // Context-aware suggestions based on live data
  const suggestions = [
    data.deliveryHealth.overdue > 0 ? "What's overdue right now?" : "How is delivery health?",
    data.clientRisk.some(c => c.riskLevel === "critical") ? `What's happening with ${data.clientRisk[0]?.name}?` : "Which clients need attention?",
    "Summarise this week's activity",
  ];

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Bot className="size-4" />Ask Tessa</CardTitle>
        <p className="text-xs text-muted-foreground">Ask about projects, clients, deadlines, or workload.</p>
      </CardHeader>
      <Separator />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bot className="size-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">Ask me anything about your projects.</p>
            <div className="mt-4 space-y-1.5">
              {suggestions.map((s) => (
                <button key={s} onClick={() => setInput(s)} className="block w-full rounded-md border px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {msg.role === "assistant" ? renderMarkdown(msg.content) : <p>{msg.content}</p>}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="space-y-2 rounded-lg bg-muted px-3 py-2"><Skeleton className="h-3 w-48" /><Skeleton className="h-3 w-32" /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="shrink-0 border-t p-3">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Tessa..." className="flex-1 text-sm" disabled={loading} />
          <Button type="submit" size="icon" disabled={!input.trim() || loading} aria-label="Send message"><Send className="size-4" /></Button>
        </form>
      </div>
    </Card>
  );
}
