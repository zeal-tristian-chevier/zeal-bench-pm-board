-- Zeal Bench PM Board — performance tuning migration
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).
--
-- Addresses Supabase's #1 perf recommendation: Postgres does NOT automatically
-- index foreign key columns, so join/eq lookups and cascade deletes do seq
-- scans. These indexes also support ORDER BY clauses used by loadAll() and
-- the query inside the ensure_self_member() SECURITY DEFINER function.
--
-- CONCURRENTLY is used so the migration does not lock the tables for writers
-- while indexes build. Each statement commits independently.

-- ── Foreign-key coverage ──────────────────────────────────────────────────

-- tasks.project_id — used by setMemberProjects cascade, consolidateProjects
-- IN (...), and every filter by project.
create index concurrently if not exists tasks_project_id_idx
  on public.tasks (project_id);

-- projects.lead_id — the "Lead" column on every project row; also touched by
-- members ON DELETE SET NULL cascade.
create index concurrently if not exists projects_lead_id_idx
  on public.projects (lead_id);

-- member_projects FK pair — PK already covers (member_id, project_id), but
-- reverse-direction lookups ("which members are on project X") need a mirror.
create index concurrently if not exists member_projects_project_id_idx
  on public.member_projects (project_id);

-- task_assignees FK pair — same story: PK covers (task_id, member_id), reverse
-- lookup ("which tasks is this member on") does not.
create index concurrently if not exists task_assignees_member_id_idx
  on public.task_assignees (member_id);

-- ── ORDER BY coverage for loadAll() ───────────────────────────────────────

-- supabase.from("projects").select("*").order("created_at")
create index concurrently if not exists projects_created_at_idx
  on public.projects (created_at);

-- supabase.from("members").select("*").order("created_at")
create index concurrently if not exists members_created_at_idx
  on public.members (created_at);

-- supabase.from("tasks").select("*").order("position")
-- Combined with project_id this also accelerates "tasks in column X for
-- project Y" if you add that filter later.
create index concurrently if not exists tasks_position_idx
  on public.tasks (position);

-- ── ensure_self_member() lookup ───────────────────────────────────────────

-- Partial index matching the exact WHERE clause: user_id = uid AND
-- auth_user_id = uid AND auth_user_id is not null. This makes first-login
-- RPC effectively O(1).
create index concurrently if not exists members_self_lookup_idx
  on public.members (user_id, auth_user_id)
  where auth_user_id is not null;

-- ── Housekeeping ──────────────────────────────────────────────────────────

-- Refresh planner stats so the new indexes get used immediately.
analyze public.members;
analyze public.projects;
analyze public.tasks;
analyze public.member_projects;
analyze public.task_assignees;
