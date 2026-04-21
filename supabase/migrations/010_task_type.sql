-- Add task_type column: "paid" or "free", defaults to "free"
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'free' CHECK (task_type IN ('paid', 'free'));
