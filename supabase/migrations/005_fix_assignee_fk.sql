-- Fix task_assignees to work with member IDs instead of auth.users IDs
-- Run this in Supabase SQL Editor

-- Drop FK constraint on task_assignees.user_id if it exists
DO $$ BEGIN
  ALTER TABLE task_assignees DROP CONSTRAINT IF EXISTS task_assignees_user_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Drop FK constraint on task_comments.author_id if it exists
DO $$ BEGIN
  ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_author_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Drop FK constraint on tasks.created_by if it exists
DO $$ BEGIN
  ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
