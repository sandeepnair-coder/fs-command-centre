// ─── Open Claw API Client ────────────────────────────────────────────────────
// Communicates with the Open Claw AI agent for intelligence tasks:
// summaries, fact extraction, classification, suggestions.

const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL;
const OPENCLAW_API_TOKEN = process.env.OPENCLAW_API_TOKEN;

export class OpenClawError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenClawError";
    this.status = status;
  }
}

async function openclawFetch<T = unknown>(
  endpoint: string,
  opts?: { method?: string; body?: unknown; timeout?: number }
): Promise<T> {
  if (!OPENCLAW_API_URL || !OPENCLAW_API_TOKEN) {
    throw new OpenClawError("Open Claw is not configured. Set OPENCLAW_API_URL and OPENCLAW_API_TOKEN.", 503);
  }

  const url = `${OPENCLAW_API_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts?.timeout || 30000);

  try {
    const res = await fetch(url, {
      method: opts?.method || "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENCLAW_API_TOKEN}`,
      },
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      throw new OpenClawError(`Open Claw API error: ${res.status} ${text}`, res.status);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof OpenClawError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new OpenClawError("Open Claw request timed out", 408);
    }
    throw new OpenClawError(`Open Claw unreachable: ${(err as Error).message}`, 503);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Health Check ───────────────────────────────────────────────────────────

export async function checkOpenClawHealth(): Promise<{
  connected: boolean;
  status: string;
  version?: string;
}> {
  try {
    const data = await openclawFetch<{ status: string; version?: string }>("/health", {
      method: "GET",
      timeout: 5000,
    });
    return { connected: true, status: data.status || "ok", version: data.version };
  } catch (err) {
    return {
      connected: false,
      status: err instanceof OpenClawError ? err.message : "unreachable",
    };
  }
}

// ─── Thread Summary ─────────────────────────────────────────────────────────

export async function summarizeThread(messages: {
  sender: string;
  body: string;
  timestamp: string;
}[]): Promise<{
  summary: string;
  open_asks: string[];
  decisions: string[];
  approvals: string[];
}> {
  return openclawFetch("/v1/summarize", {
    body: { messages },
  });
}

// ─── Extract Facts ──────────────────────────────────────────────────────────

export async function extractFacts(
  text: string,
  context?: { client_name?: string; project_name?: string }
): Promise<{
  facts: {
    key: string;
    value: string;
    confidence: "high" | "medium" | "low";
    source_excerpt: string;
  }[];
}> {
  return openclawFetch("/v1/extract-facts", {
    body: { text, context },
  });
}

// ─── Classify Message ───────────────────────────────────────────────────────

export async function classifyMessage(body: string): Promise<{
  classification: "general" | "task_candidate" | "decision" | "approval" | "blocker" | "follow_up";
  confidence: "high" | "medium" | "low";
}> {
  return openclawFetch("/v1/classify", {
    body: { text: body },
  });
}

// ─── Suggest Related Cards ──────────────────────────────────────────────────

export async function suggestRelatedCards(task: {
  title: string;
  description?: string;
  client_name?: string;
}, existingTasks: { id: string; title: string; client_name?: string }[]): Promise<{
  suggestions: {
    task_id: string;
    relation_type: string;
    confidence: "high" | "medium" | "low";
    reason: string;
  }[];
}> {
  return openclawFetch("/v1/suggest-relations", {
    body: { task, existing_tasks: existingTasks },
  });
}

// ─── Client Summary ─────────────────────────────────────────────────────────

export async function generateClientSummary(clientData: {
  name: string;
  facts: { key: string; value: string }[];
  recent_tasks: { title: string; status: string }[];
  recent_messages: { body: string; timestamp: string }[];
}): Promise<{
  summary: string;
  recent_priorities: string[];
  repeated_asks: string[];
  known_blockers: string[];
}> {
  return openclawFetch("/v1/client-summary", {
    body: clientData,
  });
}

// ─── Task Prefill ───────────────────────────────────────────────────────────

export async function prefillTask(messageContext: {
  thread_subject: string;
  messages: { sender: string; body: string; timestamp: string }[];
  client_name?: string;
}): Promise<{
  title: string;
  description: string;
  priority?: "low" | "medium" | "high" | "urgent";
  due_date?: string;
}> {
  return openclawFetch("/v1/prefill-task", {
    body: messageContext,
  });
}

// ─── Enrich Client ──────────────────────────────────────────────────────────

export async function enrichClient(seed: {
  name: string;
  email?: string;
  website?: string;
  domain?: string;
}): Promise<{
  suggestions: {
    key: string;
    value: string;
    confidence: "high" | "medium" | "low";
    source: string;
  }[];
}> {
  return openclawFetch("/v1/enrich-client", {
    body: seed,
  });
}
