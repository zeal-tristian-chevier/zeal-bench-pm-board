"use client";

import { createClient } from "./supabase/client";
import type {
  ColumnKey,
  Member,
  MemberStatus,
  Priority,
  Project,
  ProjectStatus,
  SwatchColor,
  Task,
} from "./types";

type Row<T> = T & { [k: string]: unknown };

export type BoardData = {
  projects: Project[];
  members: Member[];
  tasks: Task[];
};

export async function loadAll(): Promise<BoardData> {
  const supabase = createClient();

  const [projectsRes, membersRes, tasksRes, mpRes, taRes] = await Promise.all([
    supabase.from("projects").select("*").order("created_at"),
    supabase.from("members").select("*").order("created_at"),
    supabase.from("tasks").select("*").order("position"),
    supabase.from("member_projects").select("*"),
    supabase.from("task_assignees").select("*"),
  ]);

  for (const r of [projectsRes, membersRes, tasksRes, mpRes, taRes]) {
    if (r.error) throw r.error;
  }

  const mpByMember = new Map<string, string[]>();
  for (const r of (mpRes.data ?? []) as Row<{
    member_id: string;
    project_id: string;
  }>[]) {
    const list = mpByMember.get(r.member_id) ?? [];
    list.push(r.project_id);
    mpByMember.set(r.member_id, list);
  }

  const taByTask = new Map<string, string[]>();
  for (const r of (taRes.data ?? []) as Row<{
    task_id: string;
    member_id: string;
  }>[]) {
    const list = taByTask.get(r.task_id) ?? [];
    list.push(r.member_id);
    taByTask.set(r.task_id, list);
  }

  const projects: Project[] = (projectsRes.data ?? []).map((p: Row<Project>) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    color: p.color as SwatchColor,
    status: p.status as ProjectStatus,
    lead_id: (p.lead_id as string | null) ?? null,
    created_at: p.created_at as string,
  }));

  const members: Member[] = (membersRes.data ?? []).map((m: Row<Member>) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    status: m.status as MemberStatus,
    avatar_color: m.avatar_color as SwatchColor,
    avatar_url: (m.avatar_url as string | null) ?? null,
    project_ids: mpByMember.get(m.id) ?? [],
    created_at: m.created_at as string,
  }));

  const tasks: Task[] = (tasksRes.data ?? []).map((t: Row<Task>) => ({
    id: t.id,
    title: t.title,
    priority: t.priority as Priority,
    status_column: t.status_column as ColumnKey,
    due_date: (t.due_date as string | null) ?? null,
    project_id: (t.project_id as string | null) ?? null,
    position: (t.position as number) ?? 0,
    assignee_ids: taByTask.get(t.id) ?? [],
    created_at: t.created_at as string,
  }));

  return { projects, members, tasks };
}

export async function syncSelfAvatar(
  authUserId: string,
  avatarUrl: string | null,
  displayName: string | null,
  userEmail: string | null,
) {
  if (!avatarUrl) return;
  const supabase = createClient();

  const { error: linkedErr } = await supabase
    .from("members")
    .update({ avatar_url: avatarUrl })
    .eq("auth_user_id", authUserId);
  if (linkedErr) throw linkedErr;

  const candidates = new Set<string>();
  const push = (s: string | null | undefined) => {
    const v = (s ?? "").trim();
    if (v) candidates.add(v.toLowerCase());
  };
  push(displayName);
  if (userEmail) {
    const local = userEmail.split("@")[0] ?? "";
    push(local);
    push(local.replace(/[._-]+/g, " "));
    const parts = local.split(/[._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      push(parts.map((p) => p[0].toUpperCase() + p.slice(1)).join(" "));
    }
  }
  if (candidates.size === 0) return;

  const { data: allMembers, error: selErr } = await supabase
    .from("members")
    .select("id,name");
  if (selErr) throw selErr;

  const ids = (allMembers ?? [])
    .filter((m: { id: string; name: string }) =>
      candidates.has(m.name.trim().toLowerCase()),
    )
    .map((m: { id: string }) => m.id);
  if (ids.length === 0) return;

  const { error: updErr } = await supabase
    .from("members")
    .update({ avatar_url: avatarUrl })
    .in("id", ids);
  if (updErr) throw updErr;
}

/* ------------- Projects ------------- */

export async function createProject(input: {
  name: string;
  description: string;
  color: SwatchColor;
  status: ProjectStatus;
  lead_id: string | null;
}) {
  const supabase = createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, user_id: user.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

export async function deleteProject(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

/* ------------- Members ------------- */

export async function createMember(input: {
  name: string;
  role: string;
  status: MemberStatus;
  avatar_color: SwatchColor;
  project_ids: string[];
}) {
  const supabase = createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("members")
    .insert({
      name: input.name,
      role: input.role,
      status: input.status,
      avatar_color: input.avatar_color,
      user_id: user.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  await setMemberProjects(data.id as string, input.project_ids);
  return data;
}

export async function updateMember(
  id: string,
  input: {
    name: string;
    role: string;
    status: MemberStatus;
    avatar_color: SwatchColor;
    project_ids: string[];
  },
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("members")
    .update({
      name: input.name,
      role: input.role,
      status: input.status,
      avatar_color: input.avatar_color,
    })
    .eq("id", id);
  if (error) throw error;
  await setMemberProjects(id, input.project_ids);
}

export async function deleteMember(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw error;
}

async function setMemberProjects(memberId: string, projectIds: string[]) {
  const supabase = createClient();
  const { error: delErr } = await supabase
    .from("member_projects")
    .delete()
    .eq("member_id", memberId);
  if (delErr) throw delErr;
  if (projectIds.length === 0) return;
  const { error: insErr } = await supabase
    .from("member_projects")
    .insert(projectIds.map((pid) => ({ member_id: memberId, project_id: pid })));
  if (insErr) throw insErr;
}

/* ------------- Tasks ------------- */

export async function createTask(input: {
  title: string;
  priority: Priority;
  status_column: ColumnKey;
  due_date: string | null;
  project_id: string | null;
  assignee_ids: string[];
  position: number;
}) {
  const supabase = createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: input.title,
      priority: input.priority,
      status_column: input.status_column,
      due_date: input.due_date,
      project_id: input.project_id,
      position: input.position,
      user_id: user.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  await setTaskAssignees(data.id as string, input.assignee_ids);
  return data;
}

export async function updateTask(
  id: string,
  input: Partial<{
    title: string;
    priority: Priority;
    status_column: ColumnKey;
    due_date: string | null;
    project_id: string | null;
    position: number;
    assignee_ids: string[];
  }>,
) {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.status_column !== undefined)
    patch.status_column = input.status_column;
  if (input.due_date !== undefined) patch.due_date = input.due_date;
  if (input.project_id !== undefined) patch.project_id = input.project_id;
  if (input.position !== undefined) patch.position = input.position;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from("tasks").update(patch).eq("id", id);
    if (error) throw error;
  }
  if (input.assignee_ids !== undefined) {
    await setTaskAssignees(id, input.assignee_ids);
  }
}

export async function deleteTask(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

async function setTaskAssignees(taskId: string, memberIds: string[]) {
  const supabase = createClient();
  const { error: delErr } = await supabase
    .from("task_assignees")
    .delete()
    .eq("task_id", taskId);
  if (delErr) throw delErr;
  if (memberIds.length === 0) return;
  const { error: insErr } = await supabase
    .from("task_assignees")
    .insert(memberIds.map((mid) => ({ task_id: taskId, member_id: mid })));
  if (insErr) throw insErr;
}
