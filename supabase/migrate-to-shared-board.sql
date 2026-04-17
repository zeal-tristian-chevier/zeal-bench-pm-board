-- Flip the Zeal Bench board from per-user data to a single shared public board.
-- Every authenticated user will see and be able to edit the same rows.
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).

begin;

-- Members
drop policy if exists "members_owner_all" on public.members;
drop policy if exists "members_shared_all" on public.members;
create policy "members_shared_all" on public.members
  for all to authenticated
  using (true) with check (true);

-- Projects
drop policy if exists "projects_owner_all" on public.projects;
drop policy if exists "projects_shared_all" on public.projects;
create policy "projects_shared_all" on public.projects
  for all to authenticated
  using (true) with check (true);

-- Tasks
drop policy if exists "tasks_owner_all" on public.tasks;
drop policy if exists "tasks_shared_all" on public.tasks;
create policy "tasks_shared_all" on public.tasks
  for all to authenticated
  using (true) with check (true);

-- Join tables
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

commit;
