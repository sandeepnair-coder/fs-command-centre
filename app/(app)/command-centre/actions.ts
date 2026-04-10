"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth/getCurrentMember";

// ─── Types ──────────────────────────────────────────────────────────────────

export type CriticalItem = {
  id: string;
  type: "overdue" | "urgent" | "stale_client" | "needs_reply";
  title: string;
  subtitle: string | null;
  href: string;
  priority: "urgent" | "high" | "medium";
  age_days: number;
  client_name: string | null;
};

export type PotentialClient = {
  conversation_id: string;
  subject: string | null;
  channel: string;
  last_message_at: string;
  sender_name: string | null;
  ai_summary: string | null;
  message_count: number;
};

export type OpportunityInsight = {
  id: string;
  source_type: string;
  channel_name: string | null;
  summary: string | null;
  is_client_related: boolean;
  upsell_opportunity: boolean;
  recommended_service: string | null;
  confidence_score: number | null;
  rationale: string | null;
  status: string;
  created_at: string;
};

export type SnapshotMetrics = {
  totalClients: number;
  activeTasks: number;
  overdueTasks: number;
  urgentTasks: number;
  openConversations: number;
  needsReply: number;
  opportunities: number;
  totalRevenue: number;
};

export type RecentComm = {
  id: string;
  channel: string;
  subject: string | null;
  client_name: string | null;
  last_message_at: string;
  status: string;
  priority: string;
  ai_summary: string | null;
  sentiment: string | null;
};

// ─── Snapshot Metrics ───────────────────────────────────────────────────────

export async function getSnapshotMetrics(): Promise<SnapshotMetrics> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [clientsRes, tasksRes, overdueRes, urgentRes, convosRes, needsReplyRes, oppsRes, revenueRes] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id", { count: "exact", head: true })
      .not("column_id", "is", null),
    supabase.from("tasks").select("id", { count: "exact", head: true })
      .lt("due_date", today)
      .not("due_date", "is", null),
    supabase.from("tasks").select("id", { count: "exact", head: true })
      .eq("priority", "urgent"),
    supabase.from("conversations").select("id", { count: "exact", head: true })
      .neq("status", "resolved")
      .neq("status", "archived"),
    supabase.from("conversations").select("id", { count: "exact", head: true })
      .eq("status", "waiting_on_us"),
    supabase.from("opportunity_insights").select("id", { count: "exact", head: true })
      .eq("upsell_opportunity", true)
      .in("status", ["new", "analyzing", "analyzed"]),
    supabase.from("invoices").select("total_amount")
      .eq("type", "receivable")
      .eq("status", "paid"),
  ]);

  return {
    totalClients: clientsRes.count ?? 0,
    activeTasks: tasksRes.count ?? 0,
    overdueTasks: overdueRes.count ?? 0,
    urgentTasks: urgentRes.count ?? 0,
    openConversations: convosRes.count ?? 0,
    needsReply: needsReplyRes.count ?? 0,
    opportunities: oppsRes.count ?? 0,
    totalRevenue: (revenueRes.data || []).reduce((s, r) => s + Number(r.total_amount), 0),
  };
}

// ─── Critical Items ─────────────────────────────────────────────────────────

export async function getCriticalItems(): Promise<CriticalItem[]> {
  const supabase = await createClient();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const items: CriticalItem[] = [];

  // 1. Overdue tasks (due_date < today, not in "Approved / Done" column)
  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, priority, client_id, clients(name), project_columns(name)")
    .lt("due_date", todayStr)
    .not("due_date", "is", null)
    .order("due_date")
    .limit(15);

  for (const t of (overdueTasks || []) as Record<string, unknown>[]) {
    const col = t.project_columns as { name: string } | null;
    if (col?.name === "Approved / Done") continue;
    const dueDateMs = new Date(t.due_date as string).getTime();
    const ageDays = Math.floor((today.getTime() - dueDateMs) / 86400000);
    items.push({
      id: t.id as string,
      type: "overdue",
      title: t.title as string,
      subtitle: `${ageDays}d overdue`,
      href: "/tasks",
      priority: ageDays > 7 ? "urgent" : "high",
      age_days: ageDays,
      client_name: (t.clients as { name: string } | null)?.name ?? null,
    });
  }

  // 2. Urgent tasks not yet done
  const { data: urgentTasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, client_id, clients(name), project_columns(name)")
    .eq("priority", "urgent")
    .order("created_at", { ascending: false })
    .limit(10);

  for (const t of (urgentTasks || []) as Record<string, unknown>[]) {
    const col = t.project_columns as { name: string } | null;
    if (col?.name === "Approved / Done") continue;
    if (items.some((i) => i.id === (t.id as string))) continue;
    items.push({
      id: t.id as string,
      type: "urgent",
      title: t.title as string,
      subtitle: "Urgent priority",
      href: "/tasks",
      priority: "urgent",
      age_days: 0,
      client_name: (t.clients as { name: string } | null)?.name ?? null,
    });
  }

  // 3. Conversations waiting on us (needs reply)
  const { data: waitingConvos } = await supabase
    .from("conversations")
    .select("id, subject, last_message_at, client_id, clients(name)")
    .eq("status", "waiting_on_us")
    .order("last_message_at")
    .limit(10);

  for (const c of (waitingConvos || []) as Record<string, unknown>[]) {
    const lastMsg = new Date(c.last_message_at as string).getTime();
    const ageDays = Math.floor((today.getTime() - lastMsg) / 86400000);
    items.push({
      id: c.id as string,
      type: "needs_reply",
      title: (c.subject as string) || "Untitled conversation",
      subtitle: `Waiting ${ageDays}d for our reply`,
      href: "/comms",
      priority: ageDays > 3 ? "urgent" : ageDays > 1 ? "high" : "medium",
      age_days: ageDays,
      client_name: (c.clients as { name: string } | null)?.name ?? null,
    });
  }

  // Sort: urgent first, then by age
  items.sort((a, b) => {
    const pOrder = { urgent: 0, high: 1, medium: 2 };
    if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
    return b.age_days - a.age_days;
  });

  return items.slice(0, 20);
}

// ─── Potential Clients (unlinked conversations) ─────────────────────────────

export async function getPotentialClients(): Promise<PotentialClient[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("id, subject, channel, last_message_at, ai_summary, participants")
    .is("client_id", null)
    .neq("status", "archived")
    .order("last_message_at", { ascending: false })
    .limit(20);
  if (error) throw error;

  return (data || []).map((c) => ({
    conversation_id: c.id,
    subject: c.subject,
    channel: c.channel,
    last_message_at: c.last_message_at,
    sender_name: c.participants?.[0] || null,
    ai_summary: c.ai_summary,
    message_count: c.participants?.length ?? 0,
  }));
}

// ─── AI Opportunities ───────────────────────────────────────────────────────

export async function getOpportunities(): Promise<OpportunityInsight[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunity_insights")
    .select("id, source_type, channel_name, summary, is_client_related, upsell_opportunity, recommended_service, confidence_score, rationale, status, created_at")
    .in("status", ["new", "analyzing", "analyzed"])
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []) as OpportunityInsight[];
}

// ─── Recent Important Comms ─────────────────────────────────────────────────

export async function getRecentComms(): Promise<RecentComm[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("id, channel, subject, status, priority, last_message_at, ai_summary, sentiment, clients(name)")
    .neq("status", "archived")
    .order("last_message_at", { ascending: false })
    .limit(10);
  if (error) throw error;

  return (data || []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    channel: c.channel as string,
    subject: c.subject as string | null,
    client_name: (c.clients as { name: string } | null)?.name ?? null,
    last_message_at: c.last_message_at as string,
    status: c.status as string,
    priority: c.priority as string,
    ai_summary: c.ai_summary as string | null,
    sentiment: c.sentiment as string | null,
  }));
}

// ─── Ask OpenClaw ───────────────────────────────────────────────────────────

export async function askOpenClaw(question: string): Promise<string> {
  const member = await getCurrentMember();
  if (!member?.is_manager) throw new Error("Manager access required");

  const wsUrl = process.env.OPENCLAW_API_URL;
  const token = process.env.OPENCLAW_API_TOKEN;
  if (!wsUrl || !token) throw new Error("OpenClaw not configured");

  // Use the REST /tessa/chat endpoint (same as Slack bot)
  const baseUrl = wsUrl.replace("wss://", "https://").replace("ws://", "http://");
  const sessionId = `tessa-web-${member.id}`;

  const res = await fetch(`${baseUrl}/tessa/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: question, sessionId }),
    signal: AbortSignal.timeout(120000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API error");

  // Extract text from OpenClaw agent response
  const payloads = data.result?.payloads || data.payloads;
  if (Array.isArray(payloads) && payloads.length > 0) {
    return payloads.map((p: { text?: string }) => p.text).filter(Boolean).join("\n\n");
  }
  if (data.text) return data.text;

  return "No response received. Try rephrasing your question.";
}
