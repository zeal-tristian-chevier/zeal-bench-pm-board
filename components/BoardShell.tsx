"use client";

import { useCallback, useEffect, useState } from "react";
import { loadAll, runSeed, type BoardData } from "@/lib/data";
import type { Member, Project, Task } from "@/lib/types";
import BoardTab from "./BoardTab";
import TeamTab from "./TeamTab";
import ProjectsTab from "./ProjectsTab";

type Tab = "Board" | "Team" | "Projects";

export default function BoardShell({ userEmail }: { userEmail: string }) {
  const [tab, setTab] = useState<Tab>("Board");
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const d = await loadAll();
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setProjects = useCallback((projects: Project[]) => {
    setData((d) => (d ? { ...d, projects } : d));
  }, []);
  const setMembers = useCallback((members: Member[]) => {
    setData((d) => (d ? { ...d, members } : d));
  }, []);
  const setTasks = useCallback((tasks: Task[]) => {
    setData((d) => (d ? { ...d, tasks } : d));
  }, []);

  async function handleSeed() {
    setSeeding(true);
    try {
      await runSeed();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  const isEmpty =
    data &&
    data.projects.length === 0 &&
    data.members.length === 0 &&
    data.tasks.length === 0;

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          padding: "18px 28px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Zeal Bench PM Board</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Tracking Internal Zeal Project Progress
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {userEmail}
          </span>
          <form action="/auth/signout" method="post">
            <button className="btn" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <nav
        style={{
          padding: "10px 28px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          gap: 4,
        }}
      >
        {(["Board", "Team", "Projects"] as Tab[]).map((t) => (
          <button
            key={t}
            className="tab"
            data-active={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      <main style={{ padding: "20px 28px" }}>
        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Loading…
          </div>
        ) : error ? (
          <div
            style={{
              padding: 16,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: "var(--surface)",
              color: "var(--danger)",
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              Couldn&apos;t load board data
            </div>
            <div>{error}</div>
            <div style={{ marginTop: 10, color: "var(--text-muted)" }}>
              Make sure the Supabase schema has been applied and that the Google
              provider is enabled. See <code>supabase/schema.sql</code>.
            </div>
          </div>
        ) : data ? (
          <>
            {isEmpty ? (
              <div
                className="surface"
                style={{
                  padding: 18,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    Welcome to your board
                  </div>
                  <div style={{ color: "var(--text-muted)" }}>
                    Load the demo content or add your own projects and tasks.
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleSeed}
                  disabled={seeding}
                >
                  {seeding ? "Seeding…" : "Load demo data"}
                </button>
              </div>
            ) : null}

            {tab === "Board" ? (
              <BoardTab
                data={data}
                setTasks={setTasks}
                setProjects={setProjects}
              />
            ) : null}
            {tab === "Team" ? (
              <TeamTab data={data} setMembers={setMembers} />
            ) : null}
            {tab === "Projects" ? (
              <ProjectsTab data={data} setProjects={setProjects} />
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
