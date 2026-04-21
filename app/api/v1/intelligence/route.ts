import { NextRequest } from "next/server";
import { verifyAgentAuth, apiError, apiSuccess } from "@/lib/api/auth";
import { z } from "zod";
import { getFinanceSummary, getProjectFinancials, getCommsSummary, getTasksAdvanced, getClientStats } from "@/lib/services/intelligence-service";

const IntelligenceSchema = z.object({
  action: z.enum([
    "finance_summary",
    "project_financials",
    "comms_summary",
    "comms_needs_reply",
    "comms_unlinked",
    "comms_high_priority",
    "comms_follow_ups",
    "tasks_advanced",
    "tasks_overdue",
    "tasks_due_this_week",
    "tasks_in_progress",
    "tasks_pending_review",
    "tasks_by_assignee",
    "tasks_by_manager",
    "tasks_by_priority",
    "tasks_completed",
    "client_stats",
    "client_tasks",
  ]),
  client_name: z.string().max(200).optional(),
  client_id: z.string().uuid().optional(),
  assignee_name: z.string().max(200).optional(),
  manager_name: z.string().max(200).optional(),
  priority: z.string().max(20).optional(),
  project_name: z.string().max(200).optional(),
  search: z.string().max(200).optional(),
  channel: z.string().max(20).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export async function POST(req: NextRequest) {
  const auth = verifyAgentAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = IntelligenceSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    }
    const { action, ...params } = parsed.data;

    let result: unknown;

    switch (action) {
      case "finance_summary":
        result = await getFinanceSummary();
        break;
      case "project_financials":
        result = await getProjectFinancials();
        break;
      case "comms_summary":
        result = await getCommsSummary(params);
        break;
      case "comms_needs_reply":
        result = await getCommsSummary({ ...params, status: "waiting_on_us" });
        break;
      case "comms_unlinked":
        result = await getCommsSummary({ ...params, unlinked: true });
        break;
      case "comms_high_priority":
        result = await getCommsSummary({ ...params, priority: "high" });
        break;
      case "comms_follow_ups":
        result = await getCommsSummary({ ...params, status: "open" });
        break;
      case "tasks_advanced":
        result = await getTasksAdvanced(params);
        break;
      case "tasks_overdue":
        result = await getTasksAdvanced({ ...params, overdue_only: true });
        break;
      case "tasks_due_this_week":
        result = await getTasksAdvanced({ ...params, due_this_week: true });
        break;
      case "tasks_in_progress":
        result = await getTasksAdvanced({ ...params, status_filter: "in_progress" });
        break;
      case "tasks_pending_review":
        result = await getTasksAdvanced({ ...params, status_filter: "review" });
        break;
      case "tasks_by_assignee":
        result = await getTasksAdvanced(params);
        break;
      case "tasks_by_manager":
        result = await getTasksAdvanced(params);
        break;
      case "tasks_by_priority":
        result = await getTasksAdvanced(params);
        break;
      case "tasks_completed":
        result = await getTasksAdvanced({ ...params, status_filter: "completed" });
        break;
      case "client_stats":
        result = await getClientStats();
        break;
      case "client_tasks":
        result = await getTasksAdvanced({ ...params, status_filter: "pending" });
        break;
      default:
        return apiError("INVALID_ACTION", `Unknown action: ${action}`);
    }

    return apiSuccess(result as Record<string, unknown>);
  } catch (err) {
    return apiError("INTERNAL_ERROR", (err as Error).message, 500);
  }
}
