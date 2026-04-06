-- ═══════════════════════════════════════════════════════════════════════════════
-- 008: Channel Integrations — Gmail, Slack, WhatsApp unified comms ingestion
-- Safe: all new tables, additive columns only
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Channel Provider Configs ────────────────────────────────────────────────
-- Stores app-level OAuth credentials entered via the Settings UI
CREATE TABLE IF NOT EXISTS channel_provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE CHECK (provider IN ('gmail', 'slack', 'whatsapp')),
  config_encrypted jsonb NOT NULL DEFAULT '{}',
  is_configured boolean DEFAULT false,
  configured_by uuid REFERENCES members(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE channel_provider_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON channel_provider_configs FOR ALL USING (true);

-- ─── Channel Connections ─────────────────────────────────────────────────────
-- One row per connected account (e.g. "Sandeep's Gmail", "Fynd Studio Slack")
CREATE TABLE IF NOT EXISTS channel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('gmail', 'slack', 'whatsapp')),
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'connected', 'syncing', 'error', 'disconnected', 'reconnect_required')),
  -- OAuth / credentials (encrypted at rest via Supabase Vault or app-level)
  credentials_encrypted jsonb,
  token_expires_at timestamptz,
  refresh_token_encrypted text,
  -- Provider-specific metadata
  provider_account_id text,          -- e.g. Gmail user email, Slack team_id
  provider_metadata jsonb DEFAULT '{}',
  -- Config
  backfill_days int DEFAULT 30,
  auto_link_enabled boolean DEFAULT true,
  -- Health
  last_sync_at timestamptz,
  last_sync_status text CHECK (last_sync_status IN ('success', 'partial', 'error') OR last_sync_status IS NULL),
  last_error text,
  sync_health text DEFAULT 'unknown'
    CHECK (sync_health IN ('healthy', 'syncing', 'error', 'reconnect_required', 'unknown')),
  messages_synced_count int DEFAULT 0,
  conversations_synced_count int DEFAULT 0,
  -- Ownership
  connected_by uuid REFERENCES members(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- One active connection per provider account
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_connections_provider ON channel_connections(provider);
CREATE INDEX IF NOT EXISTS idx_channel_connections_status ON channel_connections(status);

-- ─── Channel Sources ─────────────────────────────────────────────────────────
-- Specific sources within a connection (Gmail labels, Slack channels)
CREATE TABLE IF NOT EXISTS channel_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_connection_id uuid NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('inbox', 'label', 'channel', 'group', 'dm', 'number')),
  external_id text NOT NULL,         -- e.g. Slack channel ID, Gmail label ID
  name text NOT NULL,
  is_enabled boolean DEFAULT true,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,  -- explicit channel→client mapping
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(channel_connection_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_sources_connection ON channel_sources(channel_connection_id);

-- ─── External Identities ────────────────────────────────────────────────────
-- Maps external senders/participants to clients (for auto-linking)
CREATE TABLE IF NOT EXISTS external_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('gmail', 'slack', 'whatsapp')),
  identifier text NOT NULL,          -- email, phone (E.164), Slack user ID
  identifier_type text NOT NULL CHECK (identifier_type IN ('email', 'phone', 'slack_user_id', 'slack_bot_id')),
  display_name text,
  avatar_url text,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_contact_id uuid REFERENCES client_contacts(id) ON DELETE SET NULL,
  is_team_member boolean DEFAULT false,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  confidence text DEFAULT 'high' CHECK (confidence IN ('high', 'medium', 'low')),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES members(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider, identifier)
);

CREATE INDEX IF NOT EXISTS idx_ext_identities_client ON external_identities(client_id);
CREATE INDEX IF NOT EXISTS idx_ext_identities_identifier ON external_identities(identifier);

-- ─── Extend conversations table ─────────────────────────────────────────────
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel_connection_id uuid REFERENCES channel_connections(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel_source_id uuid REFERENCES channel_sources(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_thread_id_v2 text;  -- provider-native thread ID (more precise)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source_url text;             -- link back to original thread
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_synced boolean DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sync_error text;

-- Idempotency: one conversation per thread per connection
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_connection_thread
  ON conversations(channel_connection_id, external_thread_id)
  WHERE channel_connection_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_channel_connection ON conversations(channel_connection_id);

-- ─── Conversation Participants ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  external_identity_id uuid REFERENCES external_identities(id) ON DELETE SET NULL,
  identifier text NOT NULL,
  display_name text,
  role text DEFAULT 'participant' CHECK (role IN ('sender', 'recipient', 'cc', 'bcc', 'participant')),
  is_client boolean DEFAULT false,
  is_team boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, identifier)
);

CREATE INDEX IF NOT EXISTS idx_convo_participants_convo ON conversation_participants(conversation_id);

-- ─── Extend comms_messages table ────────────────────────────────────────────
ALTER TABLE comms_messages ADD COLUMN IF NOT EXISTS channel_connection_id uuid REFERENCES channel_connections(id) ON DELETE SET NULL;
ALTER TABLE comms_messages ADD COLUMN IF NOT EXISTS external_message_id text;
ALTER TABLE comms_messages ADD COLUMN IF NOT EXISTS in_reply_to text;
ALTER TABLE comms_messages ADD COLUMN IF NOT EXISTS body_html text;
ALTER TABLE comms_messages ADD COLUMN IF NOT EXISTS raw_payload jsonb;
ALTER TABLE comms_messages ADD COLUMN IF NOT EXISTS synced_at timestamptz;

-- Idempotency: one message per external ID per connection
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_connection_external
  ON comms_messages(channel_connection_id, external_message_id)
  WHERE channel_connection_id IS NOT NULL AND external_message_id IS NOT NULL;

-- ─── Message Attachments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES comms_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  storage_url text,                 -- if downloaded/cached
  external_url text,                -- provider's URL
  provider_file_id text,            -- provider's file reference
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msg_attachments_message ON message_attachments(message_id);

-- ─── Sync Jobs ──────────────────────────────────────────────────────────────
-- Tracks backfill and incremental sync operations
CREATE TABLE IF NOT EXISTS sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_connection_id uuid NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('backfill', 'incremental', 'webhook_replay', 'manual_resync')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  messages_processed int DEFAULT 0,
  conversations_processed int DEFAULT 0,
  errors_count int DEFAULT 0,
  last_error text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_connection ON sync_jobs(channel_connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);

-- ─── Sync Cursors ───────────────────────────────────────────────────────────
-- Persists page tokens / history IDs for incremental sync
CREATE TABLE IF NOT EXISTS sync_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_connection_id uuid NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,
  cursor_type text NOT NULL CHECK (cursor_type IN ('history_id', 'page_token', 'timestamp', 'sequence')),
  cursor_value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(channel_connection_id, cursor_type)
);

-- ─── Webhook Events ─────────────────────────────────────────────────────────
-- Raw log of incoming webhook payloads for debugging
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('gmail', 'slack', 'whatsapp', 'clerk')),
  event_type text,
  payload jsonb NOT NULL,
  channel_connection_id uuid REFERENCES channel_connections(id) ON DELETE SET NULL,
  processing_status text DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processing', 'processed', 'failed', 'ignored')),
  error text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at);

-- ─── Conversation Insights ──────────────────────────────────────────────────
-- CRM intelligence extracted per conversation (by OpenClaw or other AI)
CREATE TABLE IF NOT EXISTS conversation_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  insight_type text NOT NULL
    CHECK (insight_type IN ('ask', 'deadline', 'blocker', 'risk', 'fact', 'suggested_action', 'decision', 'summary')),
  content text NOT NULL,
  -- For deadline/follow-up types
  due_date timestamptz,
  -- Resolution tracking
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES members(id),
  -- Confidence & source
  confidence text DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  source_message_id uuid REFERENCES comms_messages(id) ON DELETE SET NULL,
  -- Linking
  linked_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  linked_client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convo_insights_convo ON conversation_insights(conversation_id);
CREATE INDEX IF NOT EXISTS idx_convo_insights_type ON conversation_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_convo_insights_unresolved ON conversation_insights(conversation_id)
  WHERE is_resolved = false;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Note: App uses service role key, but RLS is enabled for defense-in-depth

ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_insights ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so these policies are for any future
-- client-side Supabase usage or additional security layers
CREATE POLICY "Service role full access" ON channel_connections FOR ALL USING (true);
CREATE POLICY "Service role full access" ON channel_sources FOR ALL USING (true);
CREATE POLICY "Service role full access" ON external_identities FOR ALL USING (true);
CREATE POLICY "Service role full access" ON conversation_participants FOR ALL USING (true);
CREATE POLICY "Service role full access" ON message_attachments FOR ALL USING (true);
CREATE POLICY "Service role full access" ON sync_jobs FOR ALL USING (true);
CREATE POLICY "Service role full access" ON sync_cursors FOR ALL USING (true);
CREATE POLICY "Service role full access" ON webhook_events FOR ALL USING (true);
CREATE POLICY "Service role full access" ON conversation_insights FOR ALL USING (true);
