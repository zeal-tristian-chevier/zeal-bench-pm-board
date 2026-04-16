"use client";

import { useEffect, useMemo, useState } from "react";
import type { BoardData } from "@/lib/data";
import { createProject, deleteProject } from "@/lib/data";
import {
  PROJECT_STATUSES,
  type Project,
  type ProjectStatus,
  type SwatchColor,
  type Task,
} from "@/lib/types";
import {
  PROJECT_STATUS_HEX,
  SWATCH_HEX,
  dueBucket,
  formatDueDate,
  initialsOf,
} from "@/lib/theme";
import { Chip, Field, Modal, SwatchPicker } from "./primitives";

export default function ProjectsTab({
  data,
  setProjects,
}: {
  data: BoardData;
  setProjects: (projects: Project[]) => void;
}) {
  const { projects, members, tasks } = data;
  const [open, setOpen] = useState(false);

  async function handleCreate(input: {
    name: string;
    description: string;
    status: ProjectStatus;
    color: SwatchColor;
    lead_id: string | null;
  }) {
    const optimistic: Project = {
      id: `tmp-${Date.now()}`,
      ...input,
      created_at: new Date().toISOString(),
    };
    const prev = projects;
    setProjects([...projects, optimistic]);
    try {
      const created = await createProject(input);
      setProjects([...projects, created]);
    } catch (err) {
      console.error(err);
      setProjects(prev);
    }
    setOpen(false);
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this project? Tasks will be unlinked.")) return;
    const prev = projects;
    setProjects(projects.filter((p) => p.id !== id));
    try {
      await deleteProject(id);
    } catch (err) {
      console.error(err);
      setProjects(prev);
    }
  }

  const progressByProject = useMemo(
    () => computeProjectProgress(projects, tasks),
    [projects, tasks],
  );

  const upcoming = useMemo(
    () => upcomingDeadlines(tasks, projects),
    [tasks, projects],
  );

  return (
    <div>
      <div
        className="reveal"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: "var(--on-primary-fixed)",
            }}
          >
            {projects.length}
          </div>
          <div
            style={{
              fontSize: 15,
              color: "var(--on-surface-variant)",
              fontStyle: "italic",
            }}
          >
            {projects.length === 1 ? "project in print" : "projects in print"}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          + Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div
          className="surface-well"
          style={{
            padding: 48,
            textAlign: "center",
            color: "var(--on-surface-variant)",
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            No Projects Yet
          </div>
          <div style={{ fontSize: 15, marginBottom: 16 }}>
            Add your first project to start composing the ledger.
          </div>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            + Add your first project
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 28,
          }}
          className="dashboard-grid"
        >
          {/* Main projects grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 20,
              }}
            >
              {projects.map((p) => {
                const lead = members.find((m) => m.id === p.lead_id);
                const color = SWATCH_HEX[p.color];
                const progress = progressByProject[p.id] ?? 0;
                const memberList = members.filter((m) =>
                  m.project_ids.includes(p.id),
                );
                return (
                  <div
                    key={p.id}
                    className="surface-card"
                    style={{
                      padding: 24,
                      position: "relative",
                      overflow: "hidden",
                      transition:
                        "box-shadow 0.18s ease, transform 0.18s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.boxShadow =
                        "var(--shadow-card-hover)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.boxShadow =
                        "var(--shadow-editorial)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <GlyphBackdrop color={color} glyph={glyphForProject(p)} />

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 20,
                        position: "relative",
                      }}
                    >
                      <Chip
                        color={PROJECT_STATUS_HEX[p.status]}
                        variant="tonal"
                      >
                        {p.status}
                      </Chip>
                      <button
                        className="icon-btn card-hover-actions"
                        data-danger="true"
                        aria-label="Remove project"
                        onClick={() => handleRemove(p.id)}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4l.5 9h5L11 4"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>

                    <h3
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        letterSpacing: "-0.015em",
                        color: "var(--on-primary-fixed)",
                        marginBottom: 8,
                        position: "relative",
                      }}
                    >
                      {p.name}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--on-surface-variant)",
                        lineHeight: 1.5,
                        marginBottom: 24,
                        minHeight: 38,
                        position: "relative",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {p.description || "No description yet."}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.14em",
                        color: "var(--on-surface-subtle)",
                        marginBottom: 10,
                      }}
                    >
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="progress" style={{ marginBottom: 18 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${progress}%`,
                          background:
                            p.status === "Complete"
                              ? "var(--success)"
                              : p.status === "On Hold"
                                ? "var(--warn)"
                                : "var(--primary)",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        position: "relative",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: "var(--on-surface-subtle)",
                            marginBottom: 4,
                          }}
                        >
                          Lead
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--on-primary-fixed)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {lead ? lead.name : "—"}
                        </div>
                      </div>
                      {memberList.length > 0 ? (
                        <div className="avatar-stack">
                          {memberList.slice(0, 3).map((m) => (
                            <span
                              key={m.id}
                              className="avatar"
                              style={{
                                background: SWATCH_HEX[m.avatar_color],
                                width: 26,
                                height: 26,
                                fontSize: 9.5,
                              }}
                              title={m.name}
                            >
                              {initialsOf(m.name)}
                            </span>
                          ))}
                          {memberList.length > 3 ? (
                            <span
                              className="avatar"
                              style={{
                                background: "var(--surface-highest)",
                                color: "var(--on-primary-fixed)",
                                width: 26,
                                height: 26,
                                fontSize: 9.5,
                              }}
                            >
                              +{memberList.length - 3}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Timeline pulse */}
            <div
              className="surface-quiet ghost-outline"
              style={{ padding: 28 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                }}
              >
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    color: "var(--on-primary-fixed)",
                  }}
                >
                  Strategic Pulse
                </h2>
                <span className="meta">
                  {tasks.filter((t) => t.status_column === "Done").length} /{" "}
                  {tasks.length} completed
                </span>
              </div>
              <PulseTimeline projects={projects} tasks={tasks} />
            </div>
          </div>

          {/* Side rail */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div className="surface-well" style={{ padding: 24 }}>
              <h2
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "var(--on-primary-fixed)",
                  marginBottom: 20,
                }}
              >
                Upcoming Deadlines
              </h2>
              {upcoming.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--on-surface-variant)",
                    fontStyle: "italic",
                    padding: "20px 0",
                    textAlign: "center",
                  }}
                >
                  No deadlines ahead — clear horizons.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                  }}
                >
                  {upcoming.map(({ task, project }) => (
                    <DeadlineRow
                      key={task.id}
                      task={task}
                      project={project}
                    />
                  ))}
                </div>
              )}
            </div>

            <div
              className="glass-white ghost-outline"
              style={{
                padding: 24,
                borderRadius: "var(--radius-lg)",
              }}
            >
              <h2
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "var(--on-primary-fixed)",
                  marginBottom: 20,
                }}
              >
                Recent Activity
              </h2>
              <ActivityList tasks={tasks} projects={projects} members={members} />
            </div>
          </div>
        </div>
      )}

      <ProjectModal
        open={open}
        onClose={() => setOpen(false)}
        members={members}
        onCreate={handleCreate}
      />
    </div>
  );
}

function DeadlineRow({
  task,
  project,
}: {
  task: Task;
  project: Project | null;
}) {
  const date = task.due_date ? new Date(task.due_date + "T00:00:00") : null;
  const month = date
    ?.toLocaleDateString(undefined, { month: "short" })
    .toUpperCase();
  const day = date?.getDate();
  const bucket = dueBucket(task.due_date);
  const accent = bucket === "overdue" ? "var(--secondary)" : "var(--primary-tint)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: "var(--radius)",
          background: "var(--surface-lowest)",
          boxShadow: "inset 0 0 0 1px var(--ghost-border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "box-shadow 0.15s ease",
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: accent,
            letterSpacing: "0.06em",
          }}
        >
          {month ?? "—"}
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "var(--on-primary-fixed)",
            lineHeight: 1,
          }}
        >
          {day ?? "—"}
        </span>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--on-primary-fixed)",
            letterSpacing: "-0.005em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {task.title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--on-surface-subtle)",
            marginTop: 3,
            fontWeight: 500,
          }}
        >
          {project?.name ?? "No project"} · {formatDueDate(task.due_date)}
        </div>
      </div>
    </div>
  );
}

function ActivityList({
  tasks,
  projects,
  members,
}: {
  tasks: Task[];
  projects: Project[];
  members: BoardData["members"];
}) {
  const recent = useMemo(() => {
    return [...tasks]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 4);
  }, [tasks]);
  if (recent.length === 0) {
    return (
      <div
        style={{
          fontSize: 13,
          color: "var(--on-surface-variant)",
          fontStyle: "italic",
          padding: "14px 0",
        }}
      >
        Nothing to report yet.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {recent.map((t) => {
        const project = projects.find((p) => p.id === t.project_id) ?? null;
        const assignee = members.find((m) => t.assignee_ids.includes(m.id));
        return (
          <div key={t.id} style={{ display: "flex", gap: 14 }}>
            <span
              className="avatar"
              style={{
                background: assignee
                  ? SWATCH_HEX[assignee.avatar_color]
                  : "var(--surface-highest)",
                color: assignee ? "#fff" : "var(--on-primary-fixed)",
                width: 32,
                height: 32,
                fontSize: 10,
                boxShadow: "0 0 0 2px var(--surface-lowest)",
              }}
            >
              {assignee ? initialsOf(assignee.name) : "—"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--on-primary-fixed)",
                  lineHeight: 1.45,
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  {assignee?.name ?? "Someone"}
                </span>{" "}
                added{" "}
                <span
                  style={{
                    color: "var(--secondary)",
                    fontWeight: 600,
                  }}
                >
                  {t.title}
                </span>
                {project ? (
                  <>
                    {" "}to{" "}
                    <span
                      className="chip"
                      style={{
                        background: "var(--tertiary-fixed)",
                        padding: "1px 5px",
                        fontSize: 9,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {project.name}
                    </span>
                  </>
                ) : null}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: "var(--on-surface-subtle)",
                  marginTop: 3,
                  letterSpacing: "0.04em",
                }}
              >
                {timeAgo(t.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PulseTimeline({
  projects,
  tasks,
}: {
  projects: Project[];
  tasks: Task[];
}) {
  const nodes = useMemo(
    () => buildTimelineNodes(projects, tasks),
    [projects, tasks],
  );
  return (
    <div style={{ position: "relative", padding: "40px 8px" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: 1,
          background: "var(--ghost-border-strong)",
          transform: "translateY(-50%)",
        }}
      />
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
        {nodes.map((n, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              textAlign: "center",
              minWidth: 110,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: n.color,
                boxShadow: `0 0 0 5px color-mix(in oklab, ${n.color} 22%, transparent)`,
                margin: "0 auto",
                position: "relative",
                zIndex: 2,
                opacity: n.muted ? 0.4 : 1,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: i % 2 === 0 ? 26 : -52,
                left: "50%",
                transform: "translateX(-50%)",
                width: 120,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: n.muted ? "var(--on-surface-subtle)" : n.color,
                  marginBottom: 3,
                }}
              >
                {n.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--on-primary-fixed)",
                  opacity: n.muted ? 0.5 : 1,
                }}
              >
                {n.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildTimelineNodes(
  projects: Project[],
  tasks: Task[],
): { label: string; sub: string; color: string; muted: boolean }[] {
  const done = tasks.filter((t) => t.status_column === "Done").length;
  const inProg = tasks.filter((t) => t.status_column === "In Progress").length;
  const todo = tasks.filter((t) => t.status_column === "To Do").length;
  const active = projects.filter((p) => p.status === "In Progress").length;

  return [
    {
      label: "Completed",
      sub: `${done} tasks shipped`,
      color: "var(--success)",
      muted: done === 0,
    },
    {
      label: "Active",
      sub: `${inProg} in flight`,
      color: "var(--secondary)",
      muted: inProg === 0,
    },
    {
      label: "Queued",
      sub: `${todo} ready for pickup`,
      color: "var(--primary-tint)",
      muted: todo === 0,
    },
    {
      label: "In Scope",
      sub: `${active} projects live`,
      color: "var(--outline)",
      muted: active === 0,
    },
  ];
}

function computeProjectProgress(
  projects: Project[],
  tasks: Task[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of projects) {
    const pt = tasks.filter((t) => t.project_id === p.id);
    if (pt.length === 0) {
      out[p.id] = p.status === "Complete" ? 100 : p.status === "Planning" ? 5 : 0;
    } else {
      const done = pt.filter((t) => t.status_column === "Done").length;
      out[p.id] = Math.round((done / pt.length) * 100);
    }
  }
  return out;
}

function upcomingDeadlines(
  tasks: Task[],
  projects: Project[],
): { task: Task; project: Project | null }[] {
  const withDates = tasks
    .filter((t) => t.due_date && t.status_column !== "Done")
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));
  return withDates.slice(0, 4).map((t) => ({
    task: t,
    project: projects.find((p) => p.id === t.project_id) ?? null,
  }));
}

function glyphForProject(project: Project): string {
  const glyphs = ["◆", "▲", "●", "■", "★", "◉", "◈", "▮", "✦", "⬢"];
  let seed = 0;
  for (const ch of project.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return glyphs[seed % glyphs.length];
}

function GlyphBackdrop({ color, glyph }: { color: string; glyph: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: -30,
        right: -20,
        fontSize: 180,
        fontWeight: 800,
        lineHeight: 1,
        color,
        opacity: 0.05,
        letterSpacing: "-0.08em",
        pointerEvents: "none",
        transform: "rotate(-8deg)",
      }}
    >
      {glyph}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

function ProjectModal({
  open,
  onClose,
  members,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  members: BoardData["members"];
  onCreate: (input: {
    name: string;
    description: string;
    status: ProjectStatus;
    color: SwatchColor;
    lead_id: string | null;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("Planning");
  const [color, setColor] = useState<SwatchColor>("blue");
  const [leadId, setLeadId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setStatus("Planning");
      setColor("blue");
      setLeadId("");
    }
  }, [open]);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        status,
        color,
        lead_id: leadId || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="New Project"
      title="Compose a project"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving…" : "Add project"}
          </button>
        </>
      }
    >
      <Field label="Name">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="e.g. Neo-Kyoto Residential"
        />
      </Field>
      <Field label="Description">
        <textarea
          className="textarea"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional — what is this project about?"
        />
      </Field>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
      >
        <Field label="Status">
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lead">
          <select
            className="select"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
          >
            <option value="">No lead</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Color">
        <SwatchPicker value={color} onChange={setColor} />
      </Field>
    </Modal>
  );
}
