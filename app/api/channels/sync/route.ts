import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth/getCurrentMember";
import { runBackfill, runIncrementalSync } from "@/lib/channels/sync";

// POST /api/channels/sync — trigger sync for a connection
export async function POST(req: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connection_id, type = "incremental" } = await req.json();
    if (!connection_id) {
      return NextResponse.json({ error: "connection_id required" }, { status: 400 });
    }

    // Run sync in background (don't block the response)
    if (type === "backfill") {
      runBackfill(connection_id).catch((err) => {
        console.error("Backfill error:", err);
      });
    } else {
      runIncrementalSync(connection_id).catch((err) => {
        console.error("Incremental sync error:", err);
      });
    }

    return NextResponse.json({ ok: true, message: `${type} sync started` });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
