-- Fynd Studio – Command Centre: Phase 0 Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- =============================================================================
-- PROFILES (mirrors auth.users for app-level user data)
-- =============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Authenticated users can view all profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- CLIENTS
-- =============================================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  created_at timestamptz default now() not null
);

alter table public.clients enable row level security;

create policy "Authenticated users can do everything on clients"
  on public.clients for all
  to authenticated
  using (true)
  with check (true);

-- =============================================================================
-- PROJECTS
-- =============================================================================
create type public.project_status as enum ('active', 'on_hold', 'completed', 'archived');

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  status public.project_status default 'active' not null,
  due_date date,
  created_at timestamptz default now() not null
);

alter table public.projects enable row level security;

create policy "Authenticated users can do everything on projects"
  on public.projects for all
  to authenticated
  using (true)
  with check (true);

-- =============================================================================
-- INDEXES
-- =============================================================================
create index if not exists idx_projects_client_id on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);
