// Adapter for sending Slack meeting notes to OpenClaw for opportunity analysis.
// Falls back to a structured stub if OpenClaw is unreachable.

import { openclawIntelligence } from "./client";

export type NoteAnalysisInput = {
  noteText: string;
  channelId: string;
  channelName?: string;
  threadTs?: string;
  senderName?: string;
};

export type NoteAnalysisResult = {
  summary: string;
  is_client_related: boolean;
  upsell_opportunity: boolean;
  recommended_service: string | null;
  confidence_score: number | null;
  rationale: string;
};

const ANALYSIS_PROMPT = `You are an internal business intelligence analyst for Fynd Studio, a design and AI-generated media agency.

You are given meeting notes captured from an internal Slack channel. Your job:

1. Summarize the note in 2-3 sentences.
2. Determine whether the note concerns a client or business discussion relevant to Fynd Studio's services (design, branding, AI-generated media, video, social content).
3. Determine whether there is a credible upsell opportunity for AI-generated media services (e.g., AI video, AI imagery, AI social content, AI ad creatives). Be conservative — only flag genuine opportunities where the client's needs clearly align with AI media capabilities.
4. If there is an opportunity, recommend a specific service.
5. Provide a confidence score from 0 to 1 (1 = very confident).
6. Explain your reasoning in 1-2 sentences.

Return ONLY valid JSON with this exact shape:
{
  "summary": "...",
  "is_client_related": true/false,
  "upsell_opportunity": true/false,
  "recommended_service": "..." or null,
  "confidence_score": 0.0-1.0 or null,
  "rationale": "..."
}

Do NOT wrap in markdown code blocks. Return raw JSON only.`;

export async function analyzeSlackNote(
  input: NoteAnalysisInput
): Promise<NoteAnalysisResult> {
  const context = [
    `Channel: ${input.channelName || input.channelId}`,
    input.senderName ? `Posted by: ${input.senderName}` : null,
    input.threadTs ? `Thread: ${input.threadTs}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const fullPrompt = `${ANALYSIS_PROMPT}\n\n--- Context ---\n${context}\n\n--- Meeting Notes ---\n${input.noteText}`;

  try {
    const result = await openclawIntelligence<NoteAnalysisResult>(
      "analyze_note",
      {
        prompt: fullPrompt,
        note_text: input.noteText,
        channel_id: input.channelId,
        channel_name: input.channelName || null,
      }
    );
    return validateResult(result);
  } catch (err) {
    console.error("[analyzeSlackNote] OpenClaw call failed, returning stub:", err);
    return {
      summary: `Meeting notes posted in ${input.channelName || input.channelId}. OpenClaw analysis unavailable.`,
      is_client_related: false,
      upsell_opportunity: false,
      recommended_service: null,
      confidence_score: null,
      rationale: "Analysis could not be completed — OpenClaw unreachable.",
    };
  }
}

function validateResult(raw: unknown): NoteAnalysisResult {
  const r = raw as Record<string, unknown>;
  return {
    summary: typeof r.summary === "string" ? r.summary : "No summary available.",
    is_client_related: r.is_client_related === true,
    upsell_opportunity: r.upsell_opportunity === true,
    recommended_service:
      typeof r.recommended_service === "string" ? r.recommended_service : null,
    confidence_score:
      typeof r.confidence_score === "number" ? r.confidence_score : null,
    rationale:
      typeof r.rationale === "string" ? r.rationale : "No rationale provided.",
  };
}
