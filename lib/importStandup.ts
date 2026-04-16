"use client";

import { createClient } from "./supabase/client";
import type { ParsedTask } from "./parseStandup";
import { SWATCHES, type SwatchColor } from "./types";

export type ImportResult = {
  createdMembers: number;
  createdProjects: number;
  createdTasks: number;
};

export async function importStandup(
  parsed: ParsedTask[],
): Promise<ImportResult> {
  const supabase = createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");
  const uid = user.user.id;

  const [membersRes, projectsRes] = await Promise.all([
    supabase.from("members").select("id,name"),
    supabase.from("projects").select("id,name"),
  ]);
  if (membersRes.error) throw membersRes.error;
  if (projectsRes.error) throw projectsRes.error;

  const memberByName = new Map<string, string>();
  for (const m of (membersRes.data ?? []) as { id: string; name: string }[]) {
    memberByName.set(normName(m.name), m.id);
  }
  const projectByName = new Map<string, string>();
  for (const p of (projectsRes.data ?? []) as { id: string; name: string }[]) {
    projectByName.set(normName(p.name), p.id);
  }

  const neededMembers = new Set<string>();
  const neededProjects = new Set<string>();
  for (const t of parsed) {
    neededMembers.add(t.memberName);
    if (t.projectName) neededProjects.add(t.projectName);
  }

  let createdMembers = 0;
  let createdProjects = 0;

  for (const name of neededMembers) {
    if (memberByName.has(normName(name))) continue;
    const { data, error } = await supabase
      .from("members")
      .insert({
        user_id: uid,
        name,
        role: "",
        status: "Available",
        avatar_color: pickSwatch(name),
      })
      .select("id,name")
      .single();
    if (error) throw error;
    memberByName.set(normName(data.name as string), data.id as string);
    createdMembers++;
  }

  for (const name of neededProjects) {
    if (projectByName.has(normName(name))) continue;
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: uid,
        name,
        description: null,
        color: pickSwatch(name),
        status: "Planning",
        lead_id: null,
      })
      .select("id,name")
      .single();
    if (error) throw error;
    projectByName.set(normName(data.name as string), data.id as string);
    createdProjects++;
  }

  const { data: maxRow } = await supabase
    .from("tasks")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  let pos = ((maxRow?.position as number | undefined) ?? -1) + 1;
  let createdTasks = 0;
  for (const t of parsed) {
    const memberId = memberByName.get(normName(t.memberName));
    if (!memberId) continue;
    const projectId = t.projectName
      ? projectByName.get(normName(t.projectName)) ?? null
      : null;
    const { data: task, error: terr } = await supabase
      .from("tasks")
      .insert({
        user_id: uid,
        title: t.title,
        priority: "Low",
        status_column: "To Do",
        due_date: null,
        project_id: projectId,
        position: pos++,
      })
      .select("id")
      .single();
    if (terr) throw terr;
    const { error: aerr } = await supabase
      .from("task_assignees")
      .insert({ task_id: task.id as string, member_id: memberId });
    if (aerr) throw aerr;
    createdTasks++;
  }

  return { createdMembers, createdProjects, createdTasks };
}

export async function wipeMyData(): Promise<void> {
  const supabase = createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");
  const uid = user.user.id;

  const del = async (table: string) => {
    const { error } = await supabase.from(table).delete().eq("user_id", uid);
    if (error) throw error;
  };
  // task_assignees + member_projects cascade from tasks/members delete
  await del("tasks");
  await del("members");
  await del("projects");
}

function normName(s: string): string {
  return s.trim().toLowerCase();
}

function pickSwatch(seed: string): SwatchColor {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return SWATCHES[h % SWATCHES.length];
}
