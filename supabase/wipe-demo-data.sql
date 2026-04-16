-- Run once in the Supabase SQL editor to remove all demo rows
-- and drop the seed helper.
-- Wipes EVERY row for EVERY user. For per-user wipe see note below.

begin;

truncate
  public.task_assignees,
  public.member_projects,
  public.tasks,
  public.projects,
  public.members
restart identity cascade;

drop function if exists public.seed_default_board();

commit;

-- Per-user wipe (keep other users' data):
-- delete from public.task_assignees where task_id in (select id from public.tasks where user_id = auth.uid());
-- delete from public.tasks where user_id = auth.uid();
-- delete from public.member_projects where member_id in (select id from public.members where user_id = auth.uid());
-- delete from public.members where user_id = auth.uid();
-- delete from public.projects where user_id = auth.uid();
