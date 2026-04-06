-- ═══════════════════════════════════════════════════════════════════════════════
-- 009: Align comms schema to v1 spec — additive only
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS preview_text text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count int DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS participants_summary text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS message_count int DEFAULT 0;

ALTER TABLE comms_messages ADD COLUMN IF NOT EXISTS direction text DEFAULT 'inbound'
  CHECK (direction IN ('inbound', 'outbound'));
ALTER TABLE comms_messages ADD COLUMN IF NOT EXISTS recipient_identifiers jsonb DEFAULT '[]';
ALTER TABLE comms_messages ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE comms_messages ADD COLUMN IF NOT EXISTS received_at timestamptz;

ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS external_event_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_external_id
  ON webhook_events(provider, external_event_id)
  WHERE external_event_id IS NOT NULL;

ALTER TABLE sync_jobs ADD COLUMN IF NOT EXISTS workspace_id text;

CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_messages_conversation ON comms_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_comms_messages_created ON comms_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_comms_messages_external ON comms_messages(external_message_id);
