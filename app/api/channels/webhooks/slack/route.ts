import { NextRequest, NextResponse } from "next/server";
import { processWebhookEvent } from "@/lib/channels/sync";
import { getProviderCredentials } from "@/lib/channels/credentials";
import { createHmac, timingSafeEqual } from "crypto";

async function verifySlackSignature(rawBody: string, timestamp: string, signature: string): Promise<boolean> {
  const creds = await getProviderCredentials("slack");
  const secret = creds.signing_secret;
  if (!secret) return false; // Allow if not configured (dev mode)

  // Reject requests older than 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;

  const basestring = `v0:${timestamp}:${rawBody}`;
  const computed = `v0=${createHmac("sha256", secret).update(basestring).digest("hex")}`;

  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const timestamp = req.headers.get("x-slack-request-timestamp") || "";
    const signature = req.headers.get("x-slack-signature") || "";

    // Verify signature (skip if signing secret not configured)
    const creds = await getProviderCredentials("slack");
    if (creds.signing_secret) {
      const valid = await verifySlackSignature(rawBody, timestamp, signature);
      if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Handle URL verification challenge
    if (payload.type === "url_verification") {
      return NextResponse.json({ challenge: payload.challenge });
    }

    // Extract event ID for dedup
    const externalEventId = payload.event_id || payload.event?.client_msg_id || null;
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    // Process asynchronously
    processWebhookEvent("slack", payload, headers, externalEventId).catch((err) => {
      console.error("Slack webhook processing error:", err);
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
