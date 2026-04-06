import { NextRequest } from "next/server";
import { verifyAgentAuth, apiError, apiSuccess } from "@/lib/api/auth";
import { ingestWhatsAppMessage } from "@/lib/channels/ingest";

/**
 * POST /api/v1/ingest-message
 *
 * Called by OpenClaw (or any agent) to ingest a raw WhatsApp/channel message
 * into the Comms system. Creates or updates conversations and messages.
 *
 * Body:
 *   from: string          — sender phone/email/ID
 *   to?: string           — recipient (optional)
 *   body: string          — message text
 *   contact_name?: string — sender display name
 *   timestamp?: string    — ISO timestamp
 *   message_id: string    — unique external message ID
 *   channel?: string      — "whatsapp" | "email" | "slack" (default: whatsapp)
 *   has_media?: boolean
 *   media?: { filename, mimetype, url }
 *   quoted_message_id?: string
 *   client_name?: string  — for auto-linking
 */
export async function POST(req: NextRequest) {
  const auth = verifyAgentAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();

    if (!body.from || !body.message_id) {
      return apiError("VALIDATION_ERROR", "from and message_id are required");
    }
    if (!body.body && !body.text) {
      return apiError("VALIDATION_ERROR", "body (message text) is required");
    }

    const result = await ingestWhatsAppMessage(body);
    return apiSuccess(result, 201);
  } catch (err) {
    return apiError("INTERNAL_ERROR", (err as Error).message, 500);
  }
}
