import { NextRequest, NextResponse } from "next/server";
import { processWebhookEvent } from "@/lib/channels/sync";

// Gmail Push Notifications via Google Cloud Pub/Sub
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    // Process asynchronously — return 200 immediately to acknowledge
    processWebhookEvent("gmail", payload, headers).catch((err) => {
      console.error("Gmail webhook processing error:", err);
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
