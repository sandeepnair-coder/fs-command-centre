-- Task Evolution: Tags, Dependencies, Completion, Activity Log
-- Run this in the Supabase SQL Editor

-- ─── Extend tasks table ─────────────────────────────────────────────────────

alter table tasks add column if not exists is_completed boolean default false;
alter table tasks add column if not exists completed_at timestamptz;
alter table tasks add column if not exists completed_by uuid;
alter table tasks add column if not exists is_milestone boolean default false;

-- ─── Tags (workspace-level) ─────────────────────────────────────────────────

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default 'gray',
  created_at timestamptz default now(),
  unique(name)
);

create table if not exists task_tags (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  created_at timestamptz default now(),
  unique(task_id, tag_id)
);

-- ─── Task Dependencies ──────────────────────────────────────────────────────

create table if not exists task_dependencies (
  id uuid primary key default gen_random_uuid(),
  blocking_task_id uuid references tasks(id) on delete cascade,
  blocked_task_id uuid references tasks(id) on delete cascade,
  created_by uuid,
  created_at timestamptz default now(),
  unique(blocking_task_id, blocked_task_id),
  check (blocking_task_id != blocked_task_id)
);

-- ─── Activity Log ───────────────────────────────────────────────────────────

create table if not exists task_activity_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  actor_id uuid,
  actor_name text,
  action text not null, -- 'created', 'moved', 'assigned', 'priority_changed', 'completed', etc.
  old_value text,
  new_value text,
  created_at timestamptz default now()
);

-- ─── Extend projects table ──────────────────────────────────────────────────

alter table projects add column if not exists current_status text default 'on_track'
  check (current_status in ('on_track','at_risk','off_track','on_hold'));

-- ─── Indexes ────────────────────────────────────────────────────────────────

create index if not exists idx_task_tags_task on task_tags(task_id);
create index if not exists idx_task_tags_tag on task_tags(tag_id);
create index if not exists idx_deps_blocking on task_dependencies(blocking_task_id);
create index if not exists idx_deps_blocked on task_dependencies(blocked_task_id);
create index if not exists idx_activity_task on task_activity_log(task_id);
create index if not exists idx_activity_date on task_activity_log(created_at);
create index if not exists idx_tasks_completed on tasks(is_completed);

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table tags enable row level security;
alter table task_tags enable row level security;
alter table task_dependencies enable row level security;
alter table task_activity_log enable row level security;

create policy "Authenticated users can manage tags" on tags for all using (auth.role() = 'authenticated');
create policy "Authenticated users can manage task_tags" on task_tags for all using (auth.role() = 'authenticated');
create policy "Authenticated users can manage task_dependencies" on task_dependencies for all using (auth.role() = 'authenticated');
create policy "Authenticated users can manage task_activity_log" on task_activity_log for all using (auth.role() = 'authenticated');
