// ─── Open Claw API Client ────────────────────────────────────────────────────
// Communicates with the Open Claw AI agent via WebSocket.
// Protocol: ws://64.23.177.147:18789
// Auth: Bearer token sent in the initial connection message.

import WebSocket from "ws";

const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL; // ws://64.23.177.147:18789
const OPENCLAW_API_TOKEN = process.env.OPENCLAW_API_TOKEN;

export class OpenClawError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenClawError";
    this.status = status;
  }
}

// ─── WebSocket request/response helper ──────────────────────────────────────

function getWsUrl(): string {
  if (!OPENCLAW_API_URL) throw new OpenClawError("OPENCLAW_API_URL not configured", 503);
  // Ensure ws:// protocol
  const url = OPENCLAW_API_URL.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://");
  return url;
}

async function openclawRequest<T = unknown>(
  action: string,
  payload: Record<string, unknown>,
  timeout = 30000
): Promise<T> {
  if (!OPENCLAW_API_URL || !OPENCLAW_API_TOKEN) {
    throw new OpenClawError("Open Claw is not configured. Set OPENCLAW_API_URL and OPENCLAW_API_TOKEN.", 503);
  }

  return new Promise<T>((resolve, reject) => {
    const wsUrl = getWsUrl();
    let ws: WebSocket;
    let timeoutId: ReturnType<typeof setTimeout>;

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      reject(new OpenClawError(`Failed to connect to Open Claw: ${(err as Error).message}`, 503));
      return;
    }

    timeoutId = setTimeout(() => {
      ws.close();
      reject(new OpenClawError("Open Claw request timed out", 408));
    }, timeout);

    ws.on("open", () => {
      // Send authenticated request
      ws.send(
        JSON.stringify({
          auth: `Bearer ${OPENCLAW_API_TOKEN}`,
          action,
          ...payload,
        })
      );
    });

    ws.on("message", (data) => {
      clearTimeout(timeoutId);
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.error) {
          ws.close();
          reject(new OpenClawError(parsed.error, parsed.status || 500));
          return;
        }
        ws.close();
        resolve(parsed as T);
      } catch {
        ws.close();
        reject(new OpenClawError("Invalid response from Open Claw", 502));
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeoutId);
      reject(new OpenClawError(`Open Claw connection error: ${err.message}`, 503));
    });

    ws.on("close", (code) => {
      clearTimeout(timeoutId);
      if (code !== 1000 && code !== 1005) {
        reject(new OpenClawError(`Open Claw connection closed unexpectedly (code ${code})`, 503));
      }
    });
  });
}

// ─── Also support HTTP for health check (fallback) ──────────────────────────

async function httpHealthCheck(): Promise<{ connected: boolean; status: string; version?: string }> {
  if (!OPENCLAW_API_URL) return { connected: false, status: "not configured" };

  const httpUrl = OPENCLAW_API_URL.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${httpUrl}/health`, {
      headers: { Authorization: `Bearer ${OPENCLAW_API_TOKEN}` },
      signal: controller.signal,
    });
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      return { connected: true, status: data.status || "ok", version: data.version };
    }
    return { connected: false, status: `HTTP ${res.status}` };
  } catch {
    return { connected: false, status: "http health check failed" };
  }
}

// ─── Health Check (try WS first, then HTTP) ─────────────────────────────────

export async function checkOpenClawHealth(): Promise<{
  connected: boolean;
  status: string;
  version?: string;
}> {
  if (!OPENCLAW_API_URL || !OPENCLAW_API_TOKEN) {
    return { connected: false, status: "not configured" };
  }

  // Try WebSocket ping
  try {
    const result = await openclawRequest<{ status: string; version?: string }>(
      "ping",
      {},
      5000
    );
    return { connected: true, status: result.status || "ok", version: result.version };
  } catch {
    // Fallback to HTTP health
    return httpHealthCheck();
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
  return openclawRequest("summarize", { messages });
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
  return openclawRequest("extract-facts", { text, context });
}

// ─── Classify Message ───────────────────────────────────────────────────────

export async function classifyMessage(body: string): Promise<{
  classification: "general" | "task_candidate" | "decision" | "approval" | "blocker" | "follow_up";
  confidence: "high" | "medium" | "low";
}> {
  return openclawRequest("classify", { text: body });
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
  return openclawRequest("suggest-relations", { task, existing_tasks: existingTasks });
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
  return openclawRequest("client-summary", clientData);
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
  return openclawRequest("prefill-task", messageContext);
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
  return openclawRequest("enrich-client", seed);
}
