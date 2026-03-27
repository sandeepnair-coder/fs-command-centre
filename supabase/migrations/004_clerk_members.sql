-- Add Clerk integration columns to members table
-- Run this in Supabase SQL Editor

-- Add new columns
alter table members add column if not exists clerk_id text unique;
alter table members add column if not exists full_name text;
alter table members add column if not exists avatar_url text;

-- Update role enum to support new roles (admin, viewer)
-- Since role is text, just ensure existing values are compatible
-- No schema change needed — role is already text

-- Add index for clerk_id lookups
create index if not exists idx_members_clerk_id on members(clerk_id);

-- Ensure the members table allows the service role to operate
-- (RLS is already set to allow authenticated users)
