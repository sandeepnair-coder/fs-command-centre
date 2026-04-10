// Heuristic detector for Granola-style meeting notes in Slack messages.
// Keeps detection logic isolated and easy to tune.

const GRANOLA_KEYWORDS = [
  "meeting notes",
  "meeting summary",
  "attendees",
  "discussion",
  "next steps",
  "action items",
  "agenda",
  "key takeaways",
  "follow-up",
  "decisions made",
  "participants",
  "transcript",
  "recap",
  "tl;dr",
  "granola",
  "added by granola",
  "open in granola",
];

// Known Granola bot user IDs (add actual IDs once known)
const KNOWN_GRANOLA_BOT_IDS: string[] = [];

// Minimum keyword matches to consider a message as meeting notes
const MIN_KEYWORD_HITS = 2;

// Minimum message length to consider (short messages are unlikely to be notes)
const MIN_NOTE_LENGTH = 150;

export type GranolaDetectionResult = {
  isGranolaNote: boolean;
  reason: string;
  keywordsFound: string[];
  confidence: "high" | "medium" | "low";
};

export function detectGranolaNote(
  text: string,
  userId?: string,
  botId?: string,
): GranolaDetectionResult {
  // Check if from known Granola bot
  if (userId && KNOWN_GRANOLA_BOT_IDS.includes(userId)) {
    return {
      isGranolaNote: true,
      reason: "Message from known Granola bot user",
      keywordsFound: [],
      confidence: "high",
    };
  }

  if (botId && KNOWN_GRANOLA_BOT_IDS.includes(botId)) {
    return {
      isGranolaNote: true,
      reason: "Message from known Granola bot",
      keywordsFound: [],
      confidence: "high",
    };
  }

  // Length check
  if (text.length < MIN_NOTE_LENGTH) {
    return {
      isGranolaNote: false,
      reason: "Message too short to be meeting notes",
      keywordsFound: [],
      confidence: "low",
    };
  }

  // Keyword matching
  const lower = text.toLowerCase();
  const hits = GRANOLA_KEYWORDS.filter((kw) => lower.includes(kw));

  if (hits.length >= 3) {
    return {
      isGranolaNote: true,
      reason: `Strong keyword match (${hits.length} keywords)`,
      keywordsFound: hits,
      confidence: "high",
    };
  }

  if (hits.length >= MIN_KEYWORD_HITS) {
    return {
      isGranolaNote: true,
      reason: `Keyword match (${hits.length} keywords)`,
      keywordsFound: hits,
      confidence: "medium",
    };
  }

  // Structural checks: numbered/bulleted lists + length suggest notes
  const hasNumberedList = /\n\s*\d+[\.\)]\s/.test(text);
  const hasBulletList = /\n\s*[-*]\s/.test(text);
  const hasHeaders = /\n\s*\*\*[^*]+\*\*/.test(text) || /\n#{1,3}\s/.test(text);
  const structuralHits = [hasNumberedList, hasBulletList, hasHeaders].filter(Boolean).length;

  if (structuralHits >= 2 && hits.length >= 1) {
    return {
      isGranolaNote: true,
      reason: "Structural pattern match (lists + headers) with keyword",
      keywordsFound: hits,
      confidence: "medium",
    };
  }

  return {
    isGranolaNote: false,
    reason: `Insufficient signals (${hits.length} keywords, ${structuralHits} structural)`,
    keywordsFound: hits,
    confidence: "low",
  };
}
