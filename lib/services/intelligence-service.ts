import { createClient } from "@/lib/supabase/server";

// ─── Finance Queries ────────────────────────────────────────────────────────

export async function getFinanceSummary() {
  const supabase = await createClient();

  const [revenueRes, expenseRes, receivableRes, payableRes, budgetRes] = await Promise.all([
    supabase.from("invoices").select("total_amount").eq("type", "receivable").eq("status", "paid"),
    supabase.from("expenses").select("amount"),
    supabase.from("invoices").select("total_amount").eq("type", "receivable").not("status", "in", "(paid,cancelled,draft)"),
    supabase.from("purchase_orders").select("total_amount").not("status", "in", "(completed,cancelled,draft)"),
    supabase.from("tasks").select("cost").not("cost", "is", null).gt("cost", 0),
  ]);

  const totalRevenue = (revenueRes.data || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalExpenses = (expenseRes.data || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const receivables = (receivableRes.data || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const payables = (payableRes.data || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalBudget = (budgetRes.data || []).reduce((s, r) => s + Number(r.cost || 0), 0);

  return {
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    net_profit: totalRevenue - totalExpenses,
    outstanding_receivables: receivables,
    outstanding_payables: payables,
    total_budget: totalBudget,
    remaining_budget: totalBudget - totalExpenses,
    budget_utilization: totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0,
    project_count: budgetRes.data?.length || 0,
  };
}

export async function getProjectFinancials() {
  const supabase = await createClient();

  const { data: tasks } = await supabase.from("tasks")
    .select("id, title, cost, client_id, clients(name), project_columns(name)")
    .not("cost", "is", null).gt("cost", 0);
  if (!tasks?.length) return { projects: [] };

  const taskIds = tasks.map(t => t.id);

  const [expRes, poRes] = await Promise.all([
    supabase.from("expenses").select("project_id, amount").in("project_id", taskIds),
    supabase.from("purchase_orders").select("project_id, total_amount").in("project_id", taskIds).neq("status", "cancelled"),
  ]);

  const spendMap: Record<string, number> = {};
  for (const e of expRes.data || []) {
    if (e.project_id) spendMap[e.project_id] = (spendMap[e.project_id] || 0) + Number(e.amount || 0);
  }
  for (const p of poRes.data || []) {
    if (p.project_id) spendMap[p.project_id] = (spendMap[p.project_id] || 0) + Number(p.total_amount || 0);
  }

  const projects = tasks.map(t => {
    const budget = Number(t.cost || 0);
    const spent = spendMap[t.id] || 0;
    return {
      task_id: t.id,
      title: t.title,
      client: (t.clients as unknown as { name: string })?.name || null,
      column: (t.project_columns as unknown as { name: string })?.name || null,
      budget, spent,
      remaining: budget - spent,
      utilization: budget > 0 ? Math.round((spent / budget) * 100) : 0,
    };
  });

  return { projects };
}

// ─── Comms Queries ──────────────────────────────────────────────────────────

export async function getCommsSummary(input: { client_name?: string; client_id?: string; status?: string; priority?: string; channel?: string; unlinked?: boolean }) {
  const supabase = await createClient();

  let clientId = input.client_id;
  if (!clientId && input.client_name) {
    const { data } = await supabase.from("clients").select("id").ilike("name", `%${input.client_name}%`).limit(1);
    clientId = data?.[0]?.id;
  }

  let query = supabase.from("conversations")
    .select("id, channel, subject, preview_text, status, priority, waiting_on, relationship_health, is_resolved, client_id, clients(name), last_message_at, message_count, unread_count, follow_up_at, ai_summary")
    .order("last_message_at", { ascending: false })
    .limit(50);

  if (clientId) query = query.eq("client_id", clientId);
  if (input.status) query = query.eq("status", input.status);
  if (input.priority) query = query.eq("priority", input.priority);
  if (input.channel) query = query.eq("channel", input.channel);
  if (input.unlinked) query = query.is("client_id", null);

  const { data: conversations, error } = await query;
  if (error) throw error;

  const convos = (conversations || []).map(c => ({
    id: c.id,
    channel: c.channel,
    subject: c.subject,
    preview: c.preview_text?.slice(0, 100) || null,
    status: c.status,
    priority: c.priority,
    waiting_on: c.waiting_on,
    health: c.relationship_health,
    is_resolved: c.is_resolved,
    client: (c.clients as unknown as { name: string })?.name || null,
    last_message_at: c.last_message_at,
    messages: c.message_count,
    unread: c.unread_count,
    follow_up_at: c.follow_up_at,
    summary: c.ai_summary?.slice(0, 200) || null,
  }));

  const needsReply = convos.filter(c => c.waiting_on === "team" || c.status === "waiting_on_us").length;
  const clientWaiting = convos.filter(c => c.waiting_on === "client" || c.status === "waiting_on_client").length;
  const highPriority = convos.filter(c => c.priority === "high" || c.priority === "urgent").length;
  const unlinked = convos.filter(c => !c.client).length;
  const pendingFollowUp = convos.filter(c => c.follow_up_at).length;

  return {
    total: convos.length,
    needs_reply: needsReply,
    client_waiting: clientWaiting,
    high_priority: highPriority,
    unlinked: unlinked,
    pending_follow_up: pendingFollowUp,
    conversations: convos,
  };
}

// ─── Advanced Task Queries ──────────────────────────────────────────────────

export async function getTasksAdvanced(input: {
  client_name?: string;
  client_id?: string;
  assignee_name?: string;
  manager_name?: string;
  priority?: string;
  overdue_only?: boolean;
  due_this_week?: boolean;
  status_filter?: string; // "pending" | "completed" | "in_progress" | "review"
  project_name?: string;
  search?: string;
  limit?: number;
}) {
  const supabase = await createClient();
  const limit = input.limit || 50;

  let clientId = input.client_id;
  if (!clientId && input.client_name) {
    const { data } = await supabase.from("clients").select("id, name").ilike("name", `%${input.client_name}%`).limit(1);
    if (data?.[0]) clientId = data[0].id;
  }

  let projectId: string | undefined;
  if (input.project_name) {
    const { data } = await supabase.from("projects").select("id").ilike("name", `%${input.project_name}%`).limit(1);
    if (data?.[0]) projectId = data[0].id;
  }

  let assigneeUserId: string | undefined;
  if (input.assignee_name) {
    const { data } = await supabase.from("members").select("id").ilike("full_name", `%${input.assignee_name}%`).limit(1);
    if (data?.[0]) assigneeUserId = data[0].id;
  }

  let managerUserId: string | undefined;
  if (input.manager_name) {
    const { data } = await supabase.from("members").select("id").ilike("full_name", `%${input.manager_name}%`).limit(1);
    if (data?.[0]) managerUserId = data[0].id;
  }

  let query = supabase.from("tasks")
    .select("id, title, priority, due_date, is_completed, column_id, project_id, client_id, manager_id, created_at, project_columns(name), projects(name), clients(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (clientId) query = query.eq("client_id", clientId);
  if (projectId) query = query.eq("project_id", projectId);
  if (managerUserId) query = query.eq("manager_id", managerUserId);
  if (input.priority) query = query.eq("priority", input.priority);
  if (input.search) query = query.ilike("title", `%${input.search}%`);

  const { data: tasks, error } = await query;
  if (error) throw error;

  let filtered = (tasks || []).map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    due_date: t.due_date,
    is_completed: t.is_completed,
    column: (t.project_columns as unknown as { name: string })?.name || "Unknown",
    project: (t.projects as unknown as { name: string })?.name || "Unknown",
    client: (t.clients as unknown as { name: string })?.name || null,
    manager_id: t.manager_id,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const doneColumns = ["approved / done", "done", "completed", "closed"];

  if (input.overdue_only) {
    filtered = filtered.filter(t => t.due_date && t.due_date < today && !t.is_completed && !doneColumns.includes(t.column.toLowerCase()));
  }
  if (input.due_this_week) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
    const weekEndStr = weekEnd.toISOString().slice(0, 10);
    filtered = filtered.filter(t => t.due_date && t.due_date >= today && t.due_date <= weekEndStr && !t.is_completed);
  }
  if (input.status_filter === "pending") {
    filtered = filtered.filter(t => !t.is_completed && !doneColumns.includes(t.column.toLowerCase()));
  } else if (input.status_filter === "completed") {
    filtered = filtered.filter(t => t.is_completed || doneColumns.includes(t.column.toLowerCase()));
  } else if (input.status_filter === "in_progress") {
    filtered = filtered.filter(t => t.column.toLowerCase().includes("progress"));
  } else if (input.status_filter === "review") {
    filtered = filtered.filter(t => t.column.toLowerCase().includes("review"));
  }

  // If filtering by assignee, we need a separate query
  if (assigneeUserId) {
    const { data: assignedTaskIds } = await supabase.from("task_assignees").select("task_id").eq("user_id", assigneeUserId);
    const idSet = new Set((assignedTaskIds || []).map(a => a.task_id));
    filtered = filtered.filter(t => idSet.has(t.id));
  }

  // Fetch assignee names for returned tasks
  const taskIds = filtered.map(t => t.id);
  let assigneeMap: Record<string, string[]> = {};
  let managerMap: Record<string, string> = {};
  if (taskIds.length > 0 && taskIds.length <= 100) {
    const { data: assignees } = await supabase.from("task_assignees").select("task_id, user_id").in("task_id", taskIds);
    const userIds = [...new Set([...(assignees || []).map(a => a.user_id), ...filtered.filter(t => t.manager_id).map(t => t.manager_id!)])];
    if (userIds.length > 0) {
      const { data: members } = await supabase.from("members").select("id, full_name").in("id", userIds);
      const nameMap = new Map((members || []).map(m => [m.id, m.full_name]));
      for (const a of assignees || []) {
        if (!assigneeMap[a.task_id]) assigneeMap[a.task_id] = [];
        assigneeMap[a.task_id].push(nameMap.get(a.user_id) || "Unknown");
      }
      for (const t of filtered) {
        if (t.manager_id) managerMap[t.id] = nameMap.get(t.manager_id) || "Unknown";
      }
    }
  }

  const result = filtered.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    due_date: t.due_date,
    is_completed: t.is_completed,
    column: t.column,
    project: t.project,
    client: t.client,
    assignees: assigneeMap[t.id] || [],
    manager: managerMap[t.id] || null,
  }));

  const completed = result.filter(t => t.is_completed || doneColumns.includes(t.column.toLowerCase())).length;
  const overdue = result.filter(t => t.due_date && t.due_date < today && !t.is_completed && !doneColumns.includes(t.column.toLowerCase())).length;

  return {
    total: result.length,
    completed,
    pending: result.length - completed,
    overdue,
    today,
    tasks: result,
  };
}

// ─── Client Stats ───────────────────────────────────────────────────────────

export async function getClientStats() {
  const supabase = await createClient();

  const [clientsRes, tasksRes, convosRes] = await Promise.all([
    supabase.from("clients").select("id, name, website, industry").order("name"),
    supabase.from("tasks").select("id, client_id, is_completed, due_date, column_id, project_columns(name)"),
    supabase.from("conversations").select("id, client_id, is_resolved"),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const doneColumns = ["approved / done", "done", "completed", "closed"];

  const taskCounts: Record<string, { total: number; open: number; overdue: number }> = {};
  for (const t of tasksRes.data || []) {
    if (!t.client_id) continue;
    if (!taskCounts[t.client_id]) taskCounts[t.client_id] = { total: 0, open: 0, overdue: 0 };
    taskCounts[t.client_id].total++;
    const colName = ((t.project_columns as unknown as { name: string })?.name || "").toLowerCase();
    if (!t.is_completed && !doneColumns.includes(colName)) {
      taskCounts[t.client_id].open++;
      if (t.due_date && t.due_date < today) taskCounts[t.client_id].overdue++;
    }
  }

  const threadCounts: Record<string, { total: number; open: number }> = {};
  for (const c of convosRes.data || []) {
    if (!c.client_id) continue;
    if (!threadCounts[c.client_id]) threadCounts[c.client_id] = { total: 0, open: 0 };
    threadCounts[c.client_id].total++;
    if (!c.is_resolved) threadCounts[c.client_id].open++;
  }

  const clients = (clientsRes.data || []).map(c => ({
    id: c.id,
    name: c.name,
    website: c.website,
    industry: c.industry,
    tasks: taskCounts[c.id] || { total: 0, open: 0, overdue: 0 },
    threads: threadCounts[c.id] || { total: 0, open: 0 },
  }));

  return {
    total_clients: clients.length,
    active_clients: clients.filter(c => c.tasks.open > 0 || c.threads.open > 0).length,
    clients_with_overdue: clients.filter(c => c.tasks.overdue > 0).length,
    clients,
  };
}
