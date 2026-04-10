import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichClient } from "@/lib/openclaw/client";

export async function POST(req: NextRequest) {
  try {
    const { client_id, name, email, website } = await req.json();
    if (!client_id || !name) {
      return NextResponse.json({ error: "client_id and name required" }, { status: 400 });
    }

    // Extract domain from website or email for enrichment
    const domain = website
      ? website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
      : email
        ? email.split("@")[1]
        : undefined;

    const result = await enrichClient({
      name,
      email: email || undefined,
      website: website || undefined,
      domain,
    });

    if (!result.suggestions?.length) {
      return NextResponse.json({ enriched: 0 });
    }

    const supabase = await createClient();

    // Upsert each suggestion as an inferred fact (append-safe — won't overwrite verified facts)
    let enriched = 0;
    for (const s of result.suggestions) {
      if (!s.key?.trim() || !s.value?.trim()) continue;

      // Check if a verified fact already exists — don't overwrite
      const { data: existing } = await supabase
        .from("client_facts")
        .select("id, verification_status")
        .eq("client_id", client_id)
        .eq("key", s.key.trim())
        .maybeSingle();

      if (existing?.verification_status === "verified") continue;

      await supabase.from("client_facts").upsert(
        {
          client_id,
          key: s.key.trim(),
          value: s.value.trim(),
          verification_status: "inferred",
          confidence: s.confidence || "medium",
          source_count: 1,
          last_observed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id,key", ignoreDuplicates: false }
      );
      enriched++;
    }

    // Log audit event
    await supabase.from("audit_log_events").insert({
      actor_type: "system",
      actor_id: null,
      event_type: "client_auto_enriched",
      entity_type: "client",
      entity_id: client_id,
      metadata_json: JSON.stringify({
        suggestions_received: result.suggestions.length,
        facts_written: enriched,
      }),
    });

    return NextResponse.json({ enriched });
  } catch (err) {
    console.error("[enrich-client]", err);
    // Don't fail loudly — enrichment is best-effort
    return NextResponse.json({ enriched: 0, error: (err as Error).message }, { status: 200 });
  }
}
