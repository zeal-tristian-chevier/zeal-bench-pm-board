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

-- Seed the board with a starter set of members / projects / tasks so a fresh
-- sign-in lands on something that actually looks like a tool. Idempotent
-- per-user: bails if the caller already owns any projects.
--
-- Note on the shared-board model: this function keys off the caller's user_id
-- when deciding whether to seed. With shared RLS (see migrate-to-shared-board.sql)
-- every authenticated user can see every row, so only the *first* user to sign
-- in will actually seed — subsequent users will see the existing rows but the
-- `exists(... where user_id = uid)` guard above returns false for them, which
-- means they'd re-seed and create duplicate demo data. If you want truly
-- once-per-board seeding, change that guard to `exists (select 1 from public.projects)`
-- with no user_id filter.
create or replace function public.seed_default_board()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p_bench uuid;
  p_internal uuid;
  p_client uuid;
  m_alex uuid;
  m_jordan uuid;
  m_sam uuid;
  m_morgan uuid;
  t1 uuid;
  t2 uuid;
  t3 uuid;
  t4 uuid;
  t5 uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.projects where user_id = uid) then
    return;
  end if;

  insert into public.members (user_id, name, role, status, avatar_color)
  values (uid, 'Alex Rivera', 'Full Stack Dev', 'Available', 'blue')
  returning id into m_alex;

  insert into public.members (user_id, name, role, status, avatar_color)
  values (uid, 'Jordan Lee', 'UI/UX Designer', 'On Project', 'orange')
  returning id into m_jordan;

  insert into public.members (user_id, name, role, status, avatar_color)
  values (uid, 'Sam Chen', 'Backend Dev', 'Partially Available', 'teal')
  returning id into m_sam;

  insert into public.members (user_id, name, role, status, avatar_color)
  values (uid, 'Morgan Davis', 'QA Engineer', 'Available', 'violet')
  returning id into m_morgan;

  insert into public.projects (user_id, name, description, color, status, lead_id)
  values (uid, 'Bench Ops', 'Internal bench operations and ops automation.', 'blue', 'In Progress', m_alex)
  returning id into p_bench;

  insert into public.projects (user_id, name, description, color, status, lead_id)
  values (uid, 'Internal Tools', 'Shared tooling for the Zeal team.', 'teal', 'Planning', m_sam)
  returning id into p_internal;

  insert into public.projects (user_id, name, description, color, status, lead_id)
  values (uid, 'Client Portal v2', 'Revamp of the external client portal.', 'orange', 'Planning', m_jordan)
  returning id into p_client;

  insert into public.member_projects (member_id, project_id) values
    (m_jordan, p_bench),
    (m_sam, p_internal),
    (m_sam, p_bench);

  insert into public.tasks (user_id, title, priority, status_column, due_date, project_id, position)
  values (uid, 'Define project scope', 'High', 'To Do', date '2026-04-20', p_bench, 0)
  returning id into t1;

  insert into public.tasks (user_id, title, priority, status_column, due_date, project_id, position)
  values (uid, 'Identify stakeholders', 'Medium', 'To Do', date '2026-04-30', p_bench, 1)
  returning id into t2;

  insert into public.tasks (user_id, title, priority, status_column, due_date, project_id, position)
  values (uid, 'Set up project repo', 'Medium', 'To Do', null, p_internal, 2)
  returning id into t3;

  insert into public.tasks (user_id, title, priority, status_column, due_date, project_id, position)
  values (uid, 'Draft initial requirements', 'High', 'In Progress', date '2026-04-18', p_bench, 0)
  returning id into t4;

  insert into public.tasks (user_id, title, priority, status_column, due_date, project_id, position)
  values (uid, 'Schedule kickoff meeting', 'Low', 'Done', date '2026-04-10', null, 0)
  returning id into t5;

  insert into public.task_assignees (task_id, member_id) values
    (t1, m_alex),
    (t1, m_jordan),
    (t2, m_alex),
    (t4, m_jordan),
    (t4, m_sam),
    (t5, m_morgan);
end;
$$;

grant execute on function public.seed_default_board() to authenticated;
