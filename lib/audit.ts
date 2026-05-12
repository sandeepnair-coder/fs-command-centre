import { createClient } from "@/lib/supabase/server";

export async function audit(
  eventType: string,
  entityType: string,
  entityId: string,
  actorType: "user" | "connector" | "system" = "user",
  actorId?: string | null,
  meta?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("audit_log_events").insert({
    actor_type: actorType,
    actor_id: actorId || null,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    metadata_json: meta ? JSON.stringify(meta) : null,
  });
}
