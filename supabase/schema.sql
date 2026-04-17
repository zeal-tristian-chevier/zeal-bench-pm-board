-- Zeal Bench PM Board — Supabase schema
-- Run in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text not null,
  status text not null default 'Available',
  avatar_color text not null default 'blue',
  auth_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.members
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

alter table public.members
  add column if not exists avatar_url text;

create unique index if not exists members_user_self_unique
  on public.members(user_id)
  where auth_user_id is not null and auth_user_id = user_id;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text not null,
  status text not null default 'Planning',
  lead_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.member_projects (
  member_id uuid not null references public.members(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  primary key (member_id, project_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  priority text not null default 'Medium',
  status_column text not null default 'To Do',
  due_date date,
  project_id uuid references public.projects(id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  primary key (task_id, member_id)
);

alter table public.members enable row level security;
alter table public.projects enable row level security;
alter table public.member_projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;

-- Shared public board: any authenticated user can read and write every row.
-- The `user_id` column is retained for audit/attribution, not access control.
-- Anonymous visitors are still blocked because each policy targets the
-- `authenticated` role.

drop policy if exists "members_owner_all" on public.members;
drop policy if exists "members_shared_all" on public.members;
create policy "members_shared_all" on public.members
  for all to authenticated
  using (true) with check (true);

drop policy if exists "projects_owner_all" on public.projects;
drop policy if exists "projects_shared_all" on public.projects;
create policy "projects_shared_all" on public.projects
  for all to authenticated
  using (true) with check (true);

drop policy if exists "tasks_owner_all" on public.tasks;
drop policy if exists "tasks_shared_all" on public.tasks;
create policy "tasks_shared_all" on public.tasks
  for all to authenticated
  using (true) with check (true);

drop policy if exists "member_projects_owner_all" on public.member_projects;
drop policy if exists "member_projects_shared_all" on public.member_projects;
create policy "member_projects_shared_all" on public.member_projects
  for all to authenticated
  using (true) with check (true);

drop policy if exists "task_assignees_owner_all" on public.task_assignees;
drop policy if exists "task_assignees_shared_all" on public.task_assignees;
create policy "task_assignees_shared_all" on public.task_assignees
  for all to authenticated
  using (true) with check (true);

-- Ensure the signed-in user is represented as a Member on their own board
-- so they can be picked as a task assignee. Idempotent across logins.
create or replace function public.ensure_self_member(
  display_name text default null,
  role text default 'Owner',
  avatar_color text default 'blue'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mid uuid;
  resolved_name text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select id into mid
  from public.members
  where user_id = uid and auth_user_id = uid
  limit 1;

  if mid is not null then
    return mid;
  end if;

  resolved_name := coalesce(
    nullif(trim(display_name), ''),
    (select u.raw_user_meta_data ->> 'full_name' from auth.users u where u.id = uid),
    (select u.raw_user_meta_data ->> 'name' from auth.users u where u.id = uid),
    (select split_part(u.email, '@', 1) from auth.users u where u.id = uid),
    'Me'
  );

  insert into public.members (user_id, auth_user_id, name, role, status, avatar_color)
  values (uid, uid, resolved_name, role, 'Available', avatar_color)
  returning id into mid;

  return mid;
end;
$$;

grant execute on function public.ensure_self_member(text, text, text) to authenticated;
