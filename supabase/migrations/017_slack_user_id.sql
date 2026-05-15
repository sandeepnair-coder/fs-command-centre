-- Add Slack user ID to members for agent write attribution
ALTER TABLE members ADD COLUMN IF NOT EXISTS slack_user_id text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_members_slack_user_id ON members(slack_user_id);
