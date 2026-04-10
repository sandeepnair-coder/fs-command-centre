"use server";

import { createClient } from "@/lib/supabase/server";

export type OpportunityInsight = {
  id: string;
  source_type: string;
  source_message_id: string | null;
  channel_id: string | null;
  channel_name: string | null;
  note_text: string;
  summary: string | null;
  is_client_related: boolean;
  upsell_opportunity: boolean;
  recommended_service: string | null;
  confidence_score: number | null;
  rationale: string | null;
  status: string;
  created_at: string;
};

export async function getInsights(limit = 50): Promise<OpportunityInsight[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunity_insights")
    .select("id, source_type, source_message_id, channel_id, channel_name, note_text, summary, is_client_related, upsell_opportunity, recommended_service, confidence_score, rationale, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as OpportunityInsight[];
}
