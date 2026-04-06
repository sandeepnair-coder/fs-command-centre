import { NextRequest, NextResponse } from "next/server";
import { processWebhookEvent } from "@/lib/channels/sync";
import { createHmac } from "crypto";

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || "";

function verifySlackSignature(body: string, timestamp: string, signature: string): boolean {
  if (!SLACK_SIGNING_SECRET) return false;
  const basestring = `v0:${timestamp}:${body}`;
  const hash = `v0=${createHmac("sha256", SLACK_SIGNING_SECRET).update(basestring).digest("hex")}`;
  return hash === signature;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const timestamp = req.headers.get("x-slack-request-timestamp") || "";
    const signature = req.headers.get("x-slack-signature") || "";

    // Verify signature
    if (SLACK_SIGNING_SECRET && !verifySlackSignature(rawBody, timestamp, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Handle URL verification challenge
    if (payload.type === "url_verification") {
      return NextResponse.json({ challenge: payload.challenge });
    }

    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    processWebhookEvent("slack", payload, headers).catch((err) => {
      console.error("Slack webhook processing error:", err);
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
