// ─── Provider Adapter Types ──────────────────────────────────────────────────
// Clean interface for channel message sync. No AI, no OpenClaw.

export type ChannelProvider = "gmail" | "slack" | "whatsapp";

export type NormalizedConversation = {
  external_thread_id: string;
  channel: "email" | "slack" | "whatsapp";
  subject: string | null;
  preview_text: string | null;
  participants: string[];
  participants_summary: string | null;
  last_message_at: string;
  source_url: string | null;
};

export type NormalizedMessage = {
  external_message_id: string;
  external_thread_id: string;
  channel: "email" | "slack" | "whatsapp";
  direction: "inbound" | "outbound";
  sender_display_name: string | null;
  sender_identifier: string;
  recipient_identifiers: string[];
  body_text: string;
  body_html: string | null;
  has_attachments: boolean;
  source_url: string | null;
  sent_at: string;
  received_at: string;
  raw_payload: Record<string, unknown> | null;
  attachments?: NormalizedAttachment[];
};

export type NormalizedAttachment = {
  external_attachment_id: string | null;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  external_url: string | null;
};

export type ProviderSource = {
  external_id: string;
  name: string;
  source_type: string;
  metadata?: Record<string, unknown>;
};

export type OAuthResult = {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  account_id: string;
  display_name: string;
  metadata?: Record<string, unknown>;
};

export interface ChannelAdapter {
  provider: ChannelProvider;
  getOAuthUrl(redirectUri: string, state: string): string;
  handleOAuthCallback(code: string, redirectUri: string): Promise<OAuthResult>;
  refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_at?: string }>;
  listSources(accessToken: string): Promise<ProviderSource[]>;
  backfill(
    accessToken: string,
    since: Date,
    sources: { external_id: string; is_enabled: boolean }[],
    onBatch: (msgs: NormalizedMessage[], convos: NormalizedConversation[]) => Promise<void>,
  ): Promise<{ cursor?: string; messagesCount: number }>;
  syncIncremental(
    accessToken: string,
    cursor: string | null,
    sources: { external_id: string; is_enabled: boolean }[],
    onBatch: (msgs: NormalizedMessage[], convos: NormalizedConversation[]) => Promise<void>,
  ): Promise<{ cursor: string; messagesCount: number }>;
  handleWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<{ messages: NormalizedMessage[]; conversations: NormalizedConversation[] } | null>;
}

// ─── DB Row Types (for UI) ──────────────────────────────────────────────────

export type ConnectionStatus = "pending" | "connected" | "syncing" | "error" | "disconnected" | "reconnect_required";
export type SyncHealth = "healthy" | "syncing" | "error" | "reconnect_required" | "unknown";

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

export type ChannelSource = {
  id: string;
  channel_connection_id: string;
  source_type: string;
  external_id: string;
  name: string;
  is_enabled: boolean;
  client_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type SyncJob = {
  id: string;
  channel_connection_id: string;
  job_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  messages_processed: number;
  conversations_processed: number;
  errors_count: number;
  last_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

// ─── UI Config Constants ────────────────────────────────────────────────────

export const PROVIDER_CONFIG: Record<ChannelProvider, {
  label: string;
  description: string;
  color: string;
  iconBg: string;
  channelType: "email" | "slack" | "whatsapp";
}> = {
  gmail: { label: "Gmail", description: "Connect a Google Workspace or personal Gmail account", color: "text-red-600 dark:text-red-400", iconBg: "bg-red-100 dark:bg-red-900/40", channelType: "email" },
  slack: { label: "Slack", description: "Install to sync messages from selected channels", color: "text-violet-600 dark:text-violet-400", iconBg: "bg-violet-100 dark:bg-violet-900/40", channelType: "slack" },
  whatsapp: { label: "WhatsApp", description: "Sync via webhook from your WhatsApp provider", color: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", channelType: "whatsapp" },
};

export const CONNECTION_STATUS_CONFIG: Record<ConnectionStatus, { label: string; color: string; dot: string }> = {
  pending: { label: "Pending", color: "text-amber-600", dot: "bg-amber-500" },
  connected: { label: "Connected", color: "text-emerald-600", dot: "bg-emerald-500" },
  syncing: { label: "Syncing", color: "text-blue-600", dot: "bg-blue-500" },
  error: { label: "Error", color: "text-red-600", dot: "bg-red-500" },
  disconnected: { label: "Disconnected", color: "text-gray-500", dot: "bg-gray-400" },
  reconnect_required: { label: "Reconnect Required", color: "text-amber-600", dot: "bg-amber-500" },
};

export const SYNC_HEALTH_CONFIG: Record<SyncHealth, { label: string; color: string }> = {
  healthy: { label: "Healthy", color: "text-emerald-600" },
  syncing: { label: "Syncing", color: "text-blue-600" },
  error: { label: "Error", color: "text-red-600" },
  reconnect_required: { label: "Reconnect", color: "text-amber-600" },
  unknown: { label: "Unknown", color: "text-gray-500" },
};
