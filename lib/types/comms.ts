// ─── Comms & Intelligence Types ──────────────────────────────────────────────
// Spec: Section 10 — Canonical Data Model

export type ChannelType = "email" | "slack" | "whatsapp";

export type MessageClassification =
  | "general"
  | "task_candidate"
  | "decision"
  | "approval"
  | "blocker"
  | "follow_up";

export type VerificationStatus = "verified" | "inferred" | "stale" | "conflicting";
export type ConfidenceBand = "high" | "medium" | "low";

export type ConnectorMode =
  | "disabled"
  | "observe_only"
  | "suggest_only"
  | "human_triggered_actions"
  | "limited_auto_actions";

export type RelationType =
  | "same_client"
  | "same_project"
  | "same_stream"
  | "depends_on"
  | "blocked_by"
  | "duplicate_of"
  | "revision_of"
  | "follow_up_to"
  | "derived_from"
  | "related_to";

// ─── Client ──────────────────────────────────────────────────────────────────

export type Client = {
  id: string;
  name: string;
  company_name: string | null;
  display_name: string | null;
  primary_email: string | null;
  website: string | null;
  phone: string | null;
  timezone: string | null;
  industry: string | null;
  business_type: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  logo_url: string | null;
  notes: string | null;
  // Billing & Tax
  billing_legal_name: string | null;
  billing_name: string | null;
  gst_number: string | null;
  pan: string | null;
  cin: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  finance_contact_name: string | null;
  finance_contact_email: string | null;
  finance_contact_phone: string | null;
  payment_terms: string | null;
  currency: string | null;
  po_invoice_notes: string | null;
  tax_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientContact = {
  id: string;
  client_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  preferred_channel: ChannelType | null;
  notes: string | null;
  verification_status: VerificationStatus;
  confidence: ConfidenceBand | null;
  created_at: string;
  updated_at: string;
};

export type ClientFact = {
  id: string;
  client_id: string;
  key: string;
  value: string;
  verification_status: VerificationStatus;
  confidence: ConfidenceBand | null;
  source_count: number;
  last_observed_at: string | null;
  accepted_at: string | null;
  accepted_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BrandAsset = {
  id: string;
  client_id: string;
  type: "brand_kit" | "logo" | "font" | "guideline" | "deck" | "brief" | "other";
  file_name: string;
  storage_url: string;
  source_message_id: string | null;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
};

// ─── Conversations / Messages ────────────────────────────────────────────────

export type ConversationStatus = "open" | "waiting_on_client" | "waiting_on_us" | "approval_pending" | "resolved" | "archived";
export type ConversationPriority = "low" | "normal" | "high" | "urgent";
export type RelationshipHealth = "active" | "at_risk" | "stale" | "awaiting_approval" | "overloaded";
export type WaitingOn = "client" | "team" | "approval" | "external";
export type Sentiment = "positive" | "neutral" | "concerned" | "urgent" | "frustrated";

export type Conversation = {
  id: string;
  channel: ChannelType;
  external_thread_id: string;
  client_id: string | null;
  project_id: string | null;
  subject: string | null;
  last_message_at: string;
  participants: string[];
  is_resolved: boolean;
  status: ConversationStatus;
  priority: ConversationPriority;
  follow_up_at: string | null;
  follow_up_owner: string | null;
  linked_project_id: string | null;
  last_client_reply_at: string | null;
  last_team_reply_at: string | null;
  relationship_health: RelationshipHealth;
  waiting_on: WaitingOn | null;
  extracted_asks: { text: string; resolved: boolean }[];
  extracted_decisions: { text: string; date: string }[];
  extracted_deadlines: { text: string; date: string }[];
  ai_summary: string | null;
  sentiment: Sentiment | null;
  created_at: string;
  updated_at: string;
  // Joined
  client_name?: string | null;
  client_industry?: string | null;
  project_name?: string | null;
  message_count?: number;
  unread_count?: number;
  linked_task_count?: number;
};

export type CommsMessage = {
  id: string;
  conversation_id: string;
  channel: ChannelType;
  client_id: string | null;
  project_id: string | null;
  sender_display_name: string | null;
  sender_identifier: string | null;
  body_text: string;
  classification: MessageClassification | null;
  has_attachments: boolean;
  is_from_client: boolean;
  source_url: string | null;
  extracted_entities: Record<string, unknown> | null;
  linked_task_ids: string[];
  linked_fact_ids: string[];
  created_at: string;
};

export type FollowUpReminder = {
  id: string;
  conversation_id: string | null;
  client_id: string | null;
  task_id: string | null;
  reminder_at: string;
  note: string | null;
  status: "pending" | "done" | "snoozed" | "cancelled";
  owner_id: string | null;
  created_at: string;
};

// ─── Work Streams ────────────────────────────────────────────────────────────

export type WorkStream = {
  id: string;
  client_id: string;
  name: string;
  project_id: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Card Relations ──────────────────────────────────────────────────────────

export type CardRelation = {
  id: string;
  from_card_id: string;
  to_card_id: string;
  relation_type: RelationType;
  origin: "explicit" | "inferred";
  confidence: ConfidenceBand | null;
  confirmed_by_user_id: string | null;
  created_at: string;
  // Joined
  related_task?: { id: string; title: string; column_id: string };
};

// ─── Connectors ──────────────────────────────────────────────────────────────

export type ConnectorConfig = {
  id: string;
  connector_key: string;
  mode: ConnectorMode;
  enabled: boolean;
  allowed_board_ids: string[];
  allowed_client_ids: string[];
  scopes: string[];
  created_at: string;
  updated_at: string;
};

export const CONNECTOR_SCOPES = {
  read: [
    "read:comms",
    "read:client_data",
    "read:board_data",
    "read:attachments",
    "read:activity_logs",
  ],
  write: [
    "write:client_suggestions",
    "write:summaries",
    "write:task_prefill",
    "write:task_drafts",
  ],
} as const;

export const CONNECTOR_MODES: { value: ConnectorMode; label: string; description: string }[] = [
  { value: "disabled", label: "Disabled", description: "Connector is off" },
  { value: "observe_only", label: "Observe Only", description: "Can read data but not write anything" },
  { value: "suggest_only", label: "Suggest Only", description: "Can write suggestions and summaries" },
  { value: "human_triggered_actions", label: "Human-Triggered", description: "Can prefill and draft, human confirms" },
];

// ─── Source References ───────────────────────────────────────────────────────

export type SourceReference = {
  id: string;
  entity_type: "client_fact" | "task_card" | "brand_asset" | "summary" | "relation";
  entity_id: string;
  message_id: string | null;
  conversation_id: string | null;
  file_id: string | null;
  excerpt: string | null;
  created_at: string;
};

// ─── Audit Log ───────────────────────────────────────────────────────────────

export type AuditLogEvent = {
  id: string;
  actor_type: "user" | "system" | "connector";
  actor_id: string | null;
  event_type: string;
  entity_type: string;
  entity_id: string;
  metadata_json: string | null;
  created_at: string;
};

// ─── UI Helpers ──────────────────────────────────────────────────────────────

export const CHANNEL_CONFIG: Record<ChannelType, { label: string; color: string }> = {
  email: { label: "Email", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  slack: { label: "Slack", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  whatsapp: { label: "WhatsApp", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

export const VERIFICATION_CONFIG: Record<VerificationStatus, { label: string; color: string }> = {
  verified: { label: "Verified", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  inferred: { label: "Inferred", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  stale: { label: "Stale", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  conflicting: { label: "Conflicting", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

export const CLASSIFICATION_CONFIG: Record<MessageClassification, { label: string; color: string }> = {
  general: { label: "General", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  task_candidate: { label: "Task", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  decision: { label: "Decision", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  approval: { label: "Approval", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  blocker: { label: "Blocker", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  follow_up: { label: "Follow-up", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
};

export const STATUS_CONFIG: Record<ConversationStatus, { label: string; color: string; dot: string }> = {
  open: { label: "Open", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", dot: "bg-blue-500" },
  waiting_on_client: { label: "Waiting on Client", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", dot: "bg-amber-500" },
  waiting_on_us: { label: "Needs Reply", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", dot: "bg-red-500" },
  approval_pending: { label: "Approval Pending", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", dot: "bg-violet-500" },
  resolved: { label: "Resolved", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-500" },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", dot: "bg-gray-400" },
};

export const HEALTH_CONFIG: Record<RelationshipHealth, { label: string; color: string; dot: string }> = {
  active: { label: "Active", color: "text-emerald-600", dot: "bg-emerald-500" },
  at_risk: { label: "At Risk", color: "text-amber-600", dot: "bg-amber-500" },
  stale: { label: "Stale", color: "text-gray-500", dot: "bg-gray-400" },
  awaiting_approval: { label: "Awaiting Approval", color: "text-violet-600", dot: "bg-violet-500" },
  overloaded: { label: "Overloaded", color: "text-red-600", dot: "bg-red-500" },
};

export const PRIORITY_CONFIG: Record<ConversationPriority, { label: string; dot: string }> = {
  low: { label: "Low", dot: "bg-gray-400" },
  normal: { label: "Normal", dot: "bg-blue-400" },
  high: { label: "High", dot: "bg-amber-500" },
  urgent: { label: "Urgent", dot: "bg-red-500" },
};

export const SENTIMENT_CONFIG: Record<Sentiment, { label: string; color: string }> = {
  positive: { label: "Positive", color: "text-emerald-600" },
  neutral: { label: "Neutral", color: "text-gray-500" },
  concerned: { label: "Concerned", color: "text-amber-600" },
  urgent: { label: "Urgent", color: "text-red-600" },
  frustrated: { label: "Frustrated", color: "text-red-700" },
};
