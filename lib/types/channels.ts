// ─── Channel Integration Types ───────────────────────────────────────────────

import type { ChannelType } from "./comms";

export type ChannelProvider = "gmail" | "slack" | "whatsapp";

export type ConnectionStatus =
  | "pending"
  | "connected"
  | "syncing"
  | "error"
  | "disconnected"
  | "reconnect_required";

export type SyncHealth = "healthy" | "syncing" | "error" | "reconnect_required" | "unknown";
export type SyncJobType = "backfill" | "incremental" | "webhook_replay" | "manual_resync";
export type SyncJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type WebhookProcessingStatus = "received" | "processing" | "processed" | "failed" | "ignored";
export type InsightType = "ask" | "deadline" | "blocker" | "risk" | "fact" | "suggested_action" | "decision" | "summary";
export type IdentifierType = "email" | "phone" | "slack_user_id" | "slack_bot_id";

// ─── Channel Connection ──────────────────────────────────────────────────────

export type ChannelConnection = {
  id: string;
  provider: ChannelProvider;
  display_name: string;
  status: ConnectionStatus;
  credentials_encrypted: Record<string, unknown> | null;
  token_expires_at: string | null;
  refresh_token_encrypted: string | null;
  provider_account_id: string | null;
  provider_metadata: Record<string, unknown>;
  backfill_days: number;
  auto_link_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: "success" | "partial" | "error" | null;
  last_error: string | null;
  sync_health: SyncHealth;
  messages_synced_count: number;
  conversations_synced_count: number;
  connected_by: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Channel Source ──────────────────────────────────────────────────────────

export type ChannelSourceType = "inbox" | "label" | "channel" | "group" | "dm" | "number";

export type ChannelSource = {
  id: string;
  channel_connection_id: string;
  source_type: ChannelSourceType;
  external_id: string;
  name: string;
  is_enabled: boolean;
  client_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// ─── External Identity ──────────────────────────────────────────────────────

export type ExternalIdentity = {
  id: string;
  provider: ChannelProvider;
  identifier: string;
  identifier_type: IdentifierType;
  display_name: string | null;
  avatar_url: string | null;
  client_id: string | null;
  client_contact_id: string | null;
  is_team_member: boolean;
  member_id: string | null;
  confidence: "high" | "medium" | "low";
  resolved_at: string | null;
  resolved_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// ─── Sync Job ───────────────────────────────────────────────────────────────

export type SyncJob = {
  id: string;
  channel_connection_id: string;
  job_type: SyncJobType;
  status: SyncJobStatus;
  started_at: string | null;
  completed_at: string | null;
  messages_processed: number;
  conversations_processed: number;
  errors_count: number;
  last_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

// ─── Sync Cursor ────────────────────────────────────────────────────────────

export type SyncCursor = {
  id: string;
  channel_connection_id: string;
  cursor_type: "history_id" | "page_token" | "timestamp" | "sequence";
  cursor_value: string;
  updated_at: string;
};

// ─── Webhook Event ──────────────────────────────────────────────────────────

export type WebhookEvent = {
  id: string;
  provider: ChannelProvider;
  event_type: string | null;
  payload: Record<string, unknown>;
  channel_connection_id: string | null;
  processing_status: WebhookProcessingStatus;
  error: string | null;
  processed_at: string | null;
  created_at: string;
};

// ─── Conversation Insight ───────────────────────────────────────────────────

export type ConversationInsight = {
  id: string;
  conversation_id: string;
  insight_type: InsightType;
  content: string;
  due_date: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  confidence: "high" | "medium" | "low";
  source_message_id: string | null;
  linked_task_id: string | null;
  linked_client_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// ─── Conversation Participant ───────────────────────────────────────────────

export type ConversationParticipant = {
  id: string;
  conversation_id: string;
  external_identity_id: string | null;
  identifier: string;
  display_name: string | null;
  role: "sender" | "recipient" | "cc" | "bcc" | "participant";
  is_client: boolean;
  is_team: boolean;
  created_at: string;
};

// ─── Provider Adapter Interface ─────────────────────────────────────────────

export type NormalizedConversation = {
  external_thread_id: string;
  channel: ChannelType;
  subject: string | null;
  participants: string[];
  last_message_at: string;
  source_url: string | null;
};

export type NormalizedMessage = {
  external_message_id: string;
  external_thread_id: string;
  channel: ChannelType;
  sender_display_name: string | null;
  sender_identifier: string;
  body_text: string;
  body_html: string | null;
  has_attachments: boolean;
  is_from_client: boolean;
  in_reply_to: string | null;
  source_url: string | null;
  created_at: string;
  raw_payload: Record<string, unknown> | null;
  attachments?: NormalizedAttachment[];
};

export type NormalizedAttachment = {
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  external_url: string | null;
  provider_file_id: string | null;
};

export type OAuthStartResult = {
  authorization_url: string;
  state: string;
};

export type OAuthCallbackResult = {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  account_id: string;
  account_display_name: string;
  metadata?: Record<string, unknown>;
};

export type ProviderSource = {
  external_id: string;
  name: string;
  source_type: ChannelSourceType;
  metadata?: Record<string, unknown>;
};

export interface ChannelAdapter {
  provider: ChannelProvider;

  /** Generate the OAuth authorization URL */
  getOAuthUrl(redirectUri: string, state: string): string;

  /** Exchange OAuth code for tokens */
  handleOAuthCallback(code: string, redirectUri: string): Promise<OAuthCallbackResult>;

  /** Refresh an expired access token */
  refreshToken(refreshToken: string): Promise<{ access_token: string; expires_at?: string }>;

  /** List available sources (labels, channels, etc.) */
  listSources(accessToken: string, metadata?: Record<string, unknown>): Promise<ProviderSource[]>;

  /** Backfill messages from a given date */
  backfill(
    accessToken: string,
    since: Date,
    sources: ChannelSource[],
    onBatch: (messages: NormalizedMessage[], conversations: NormalizedConversation[]) => Promise<void>,
  ): Promise<{ cursor?: string; messagesCount: number }>;

  /** Incremental sync from last cursor */
  syncIncremental(
    accessToken: string,
    cursor: string | null,
    sources: ChannelSource[],
    onBatch: (messages: NormalizedMessage[], conversations: NormalizedConversation[]) => Promise<void>,
  ): Promise<{ cursor: string; messagesCount: number }>;

  /** Process an incoming webhook event */
  handleWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<{ messages: NormalizedMessage[]; conversations: NormalizedConversation[] } | null>;
}

// ─── UI Helpers ─────────────────────────────────────────────────────────────

export const PROVIDER_CONFIG: Record<ChannelProvider, {
  label: string;
  description: string;
  color: string;
  iconBg: string;
  channelType: ChannelType;
}> = {
  gmail: {
    label: "Gmail",
    description: "Connect a Google Workspace or personal Gmail account",
    color: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    channelType: "email",
  },
  slack: {
    label: "Slack",
    description: "Install to sync messages from selected channels",
    color: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
    channelType: "slack",
  },
  whatsapp: {
    label: "WhatsApp",
    description: "Sync via existing OpenClaw WhatsApp gateway",
    color: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    channelType: "whatsapp",
  },
};

export const CONNECTION_STATUS_CONFIG: Record<ConnectionStatus, {
  label: string;
  color: string;
  dot: string;
}> = {
  pending: { label: "Pending", color: "text-amber-600", dot: "bg-amber-500" },
  connected: { label: "Connected", color: "text-emerald-600", dot: "bg-emerald-500" },
  syncing: { label: "Syncing", color: "text-blue-600", dot: "bg-blue-500" },
  error: { label: "Error", color: "text-red-600", dot: "bg-red-500" },
  disconnected: { label: "Disconnected", color: "text-gray-500", dot: "bg-gray-400" },
  reconnect_required: { label: "Reconnect Required", color: "text-amber-600", dot: "bg-amber-500" },
};

export const SYNC_HEALTH_CONFIG: Record<SyncHealth, {
  label: string;
  color: string;
}> = {
  healthy: { label: "Healthy", color: "text-emerald-600" },
  syncing: { label: "Syncing", color: "text-blue-600" },
  error: { label: "Error", color: "text-red-600" },
  reconnect_required: { label: "Reconnect", color: "text-amber-600" },
  unknown: { label: "Unknown", color: "text-gray-500" },
};

export const INSIGHT_TYPE_CONFIG: Record<InsightType, {
  label: string;
  color: string;
}> = {
  ask: { label: "Ask", color: "text-amber-600" },
  deadline: { label: "Deadline", color: "text-red-600" },
  blocker: { label: "Blocker", color: "text-red-700" },
  risk: { label: "Risk", color: "text-orange-600" },
  fact: { label: "Fact", color: "text-blue-600" },
  suggested_action: { label: "Action", color: "text-violet-600" },
  decision: { label: "Decision", color: "text-emerald-600" },
  summary: { label: "Summary", color: "text-gray-600" },
};
