// ─── Open Claw Gateway Client ────────────────────────────────────────────────
// Protocol: WebSocket with challenge-response handshake (protocol v3).
//
// Flow:
// 1. Connect to ws://host:port
// 2. Server sends { type:"event", event:"connect.challenge", payload:{ nonce, ts } }
// 3. Client sends { type:"req", id, method:"connect", params:{ minProtocol:3, maxProtocol:3, client:{id,platform,mode,version}, auth:{token}, role } }
// 4. Server sends { type:"res", id, ok:true, payload:{ type:"hello-ok", protocol:3 } }
// 5. Client sends requests as { type:"req", id, method, params }
// 6. Server responds with { type:"res", id, ok, payload|error }

import WebSocket from "ws";
import { randomUUID } from "crypto";

const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL;
const OPENCLAW_API_TOKEN = process.env.OPENCLAW_API_TOKEN;

const CLIENT_INFO = {
  id: "cli",
  platform: "web",
  mode: "cli",
  version: "1.0.0",
} as const;

export class OpenClawError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenClawError";
    this.status = status;
  }
}

function getWsUrl(): string {
  if (!OPENCLAW_API_URL) throw new OpenClawError("OPENCLAW_API_URL not configured", 503);
  return OPENCLAW_API_URL.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://");
}

// ─── Core: authenticated request over gateway WS ────────────────────────────

async function openclawRequest<T = unknown>(
  method: string,
  params: Record<string, unknown>,
  timeout = 30000
): Promise<T> {
  if (!OPENCLAW_API_URL || !OPENCLAW_API_TOKEN) {
    throw new OpenClawError("Open Claw not configured. Set OPENCLAW_API_URL and OPENCLAW_API_TOKEN.", 503);
  }

  return new Promise<T>((resolve, reject) => {
    const wsUrl = getWsUrl();
    let ws: WebSocket;
    let timeoutId: ReturnType<typeof setTimeout>;
    let connectId: string;
    let requestId: string;

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      reject(new OpenClawError(`Failed to connect: ${(err as Error).message}`, 503));
      return;
    }

    timeoutId = setTimeout(() => {
      ws.close();
      reject(new OpenClawError("Open Claw request timed out", 408));
    }, timeout);

    ws.on("message", (raw) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      const msgType = msg.type as string;
      const event = msg.event as string;

      // Step 1: Receive challenge → send connect handshake
      if (msgType === "event" && event === "connect.challenge") {
        connectId = randomUUID();
        ws.send(JSON.stringify({
          type: "req",
          id: connectId,
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: CLIENT_INFO,
            auth: { token: OPENCLAW_API_TOKEN },
            role: "admin",
          },
        }));
        return;
      }

      // Step 2: Connect response → send actual request
      if (msgType === "res" && msg.id === connectId) {
        if (!msg.ok) {
          clearTimeout(timeoutId);
          ws.close();
          const err = msg.error as { message?: string } | undefined;
          reject(new OpenClawError(err?.message || "Connect rejected", 401));
          return;
        }
        // Authenticated — now send the real request
        requestId = randomUUID();
        ws.send(JSON.stringify({
          type: "req",
          id: requestId,
          method,
          params,
        }));
        return;
      }

      // Step 3: Response to our actual request
      if (msgType === "res" && msg.id === requestId) {
        clearTimeout(timeoutId);
        ws.close();
        if (!msg.ok) {
          const err = msg.error as { message?: string } | undefined;
          reject(new OpenClawError(err?.message || "Request failed", 500));
        } else {
          resolve((msg.payload || msg) as T);
        }
        return;
      }

      // Handle error events
      if (msgType === "error" || (msgType === "event" && event === "connect.error")) {
        clearTimeout(timeoutId);
        ws.close();
        reject(new OpenClawError((msg.message || "Gateway error") as string, 500));
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeoutId);
      reject(new OpenClawError(`Connection error: ${err.message}`, 503));
    });

    ws.on("close", (code, reason) => {
      clearTimeout(timeoutId);
      if (code === 1008) {
        reject(new OpenClawError(`Rejected: ${reason.toString()}`, 401));
      }
    });
  });
}

// ─── Health Check ───────────────────────────────────────────────────────────

export async function checkOpenClawHealth(): Promise<{
  connected: boolean;
  status: string;
  version?: string;
  protocol?: number;
}> {
  if (!OPENCLAW_API_URL || !OPENCLAW_API_TOKEN) {
    return { connected: false, status: "not configured" };
  }

  return new Promise((resolve) => {
    const wsUrl = getWsUrl();
    let ws: WebSocket;
    const tid = setTimeout(() => {
      try { ws.close(); } catch {}
      resolve({ connected: false, status: "timeout" });
    }, 8000);

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      clearTimeout(tid);
      resolve({ connected: false, status: "unreachable" });
      return;
    }

    ws.on("message", (raw) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === "event" && msg.event === "connect.challenge") {
        ws.send(JSON.stringify({
          type: "req",
          id: randomUUID(),
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: CLIENT_INFO,
            auth: { token: OPENCLAW_API_TOKEN },
            role: "admin",
          },
        }));
        return;
      }

      if (msg.type === "res" && msg.ok) {
        clearTimeout(tid);
        ws.close();
        const payload = (msg.payload || {}) as Record<string, unknown>;
        resolve({
          connected: true,
          status: "ok",
          protocol: payload.protocol as number | undefined,
          version: (payload.version as string) || undefined,
        });
        return;
      }

      if (msg.type === "res" && !msg.ok) {
        clearTimeout(tid);
        ws.close();
        const err = msg.error as { message?: string } | undefined;
        resolve({ connected: false, status: err?.message || "rejected" });
      }
    });

    ws.on("error", () => {
      clearTimeout(tid);
      resolve({ connected: false, status: "unreachable" });
    });

    ws.on("close", (code) => {
      clearTimeout(tid);
      if (code === 1008) resolve({ connected: false, status: "auth rejected" });
    });
  });
}

// ─── Generic Request (for new workflows) ────────────────────────────────────

export async function openclawIntelligence<T = unknown>(
  method: string,
  params: Record<string, unknown>,
  timeout = 60000,
): Promise<T> {
  return openclawRequest<T>(method, params, timeout);
}

// ─── Intelligence APIs ──────────────────────────────────────────────────────

export async function summarizeThread(messages: {
  sender: string; body: string; timestamp: string;
}[]): Promise<{
  summary: string; open_asks: string[]; decisions: string[]; approvals: string[];
}> {
  return openclawRequest("summarize", { messages });
}

export async function extractFacts(
  text: string,
  context?: { client_name?: string; project_name?: string }
): Promise<{
  facts: { key: string; value: string; confidence: "high" | "medium" | "low"; source_excerpt: string }[];
}> {
  return openclawRequest("extract-facts", { text, context });
}

export async function classifyMessage(body: string): Promise<{
  classification: "general" | "task_candidate" | "decision" | "approval" | "blocker" | "follow_up";
  confidence: "high" | "medium" | "low";
}> {
  return openclawRequest("classify", { text: body });
}

export async function suggestRelatedCards(
  task: { title: string; description?: string; client_name?: string },
  existingTasks: { id: string; title: string; client_name?: string }[]
): Promise<{
  suggestions: { task_id: string; relation_type: string; confidence: "high" | "medium" | "low"; reason: string }[];
}> {
  return openclawRequest("suggest-relations", { task, existing_tasks: existingTasks });
}

export async function generateClientSummary(clientData: {
  name: string;
  facts: { key: string; value: string }[];
  recent_tasks: { title: string; status: string }[];
  recent_messages: { body: string; timestamp: string }[];
}): Promise<{
  summary: string; recent_priorities: string[]; repeated_asks: string[]; known_blockers: string[];
}> {
  return openclawRequest("client-summary", clientData);
}

export async function prefillTask(messageContext: {
  thread_subject: string;
  messages: { sender: string; body: string; timestamp: string }[];
  client_name?: string;
}): Promise<{
  title: string; description: string; priority?: "low" | "medium" | "high" | "urgent"; due_date?: string;
}> {
  return openclawRequest("prefill-task", messageContext);
}

export async function enrichClient(seed: {
  name: string; email?: string; website?: string; domain?: string;
}): Promise<{
  suggestions: { key: string; value: string; confidence: "high" | "medium" | "low"; source: string }[];
}> {
  return openclawRequest("enrich-client", seed);
}
