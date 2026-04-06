import { NextRequest } from "next/server";
import { verifyAgentAuth, apiError, apiSuccess } from "@/lib/api/auth";
import { processWebhookEvent } from "@/lib/channels/sync";

/**
 * POST /api/v1/ingest-message
 * Ingest a raw message from any channel into the Comms system.
 * Used by OpenClaw or other agents to forward messages.
 */
export async function POST(req: NextRequest) {
  const auth = verifyAgentAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const channel = body.channel || "whatsapp";

    if (!body.from && !body.sender) return apiError("VALIDATION_ERROR", "from is required");
    if (!body.body && !body.text && !body.message) return apiError("VALIDATION_ERROR", "body is required");

    const msgId = body.message_id || body.messageId || body.id || `ingest-${Date.now()}`;
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    await processWebhookEvent(channel, body, headers, msgId);
    return apiSuccess({ ingested: true, message_id: msgId }, 201);
  } catch (err) {
    return apiError("INTERNAL_ERROR", (err as Error).message, 500);
  }
}
