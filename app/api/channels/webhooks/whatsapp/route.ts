import { NextRequest, NextResponse } from "next/server";
import { processWebhookEvent } from "@/lib/channels/sync";

// WhatsApp messages arrive via OpenClaw gateway
// This endpoint receives normalized WhatsApp messages and feeds them into the sync engine
export async function POST(req: NextRequest) {
  try {
    // Verify OpenClaw token
    const auth = req.headers.get("authorization");
    const token = process.env.OPENCLAW_API_TOKEN;
    if (token && auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    processWebhookEvent("whatsapp", payload, headers).catch((err) => {
      console.error("WhatsApp webhook processing error:", err);
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
