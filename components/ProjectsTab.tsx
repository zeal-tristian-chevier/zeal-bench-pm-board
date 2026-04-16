"use client";

import { useEffect, useState } from "react";
import type { BoardData } from "@/lib/data";
import { createProject, deleteProject } from "@/lib/data";
import {
  PROJECT_STATUSES,
  type Project,
  type ProjectStatus,
  type SwatchColor,
} from "@/lib/types";
import { PROJECT_STATUS_HEX, SWATCH_HEX } from "@/lib/theme";
import { Chip, Field, Modal, SwatchPicker } from "./primitives";

export default function ProjectsTab({
  data,
  setProjects,
}: {
  data: BoardData;
  setProjects: (projects: Project[]) => void;
}) {
  const { projects, members } = data;
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

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          + Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div
          className="surface"
          style={{
            padding: 24,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          No projects yet. Add your first one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map((p) => {
            const lead = members.find((m) => m.id === p.lead_id);
            const color = SWATCH_HEX[p.color];
            return (
              <div
                key={p.id}
                className="surface card"
                style={{
                  padding: "12px 14px",
                  borderLeft: `3px solid ${color}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <Chip color={PROJECT_STATUS_HEX[p.status]}>{p.status}</Chip>
                  </div>
                  {p.description ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 4,
                      }}
                    >
                      {p.description}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    minWidth: 120,
                    textAlign: "right",
                  }}
                >
                  {lead ? (
                    <>
                      Lead: <span style={{ color: "var(--text)" }}>{lead.name}</span>
                    </>
                  ) : (
                    "No lead"
                  )}
                </div>
                <button
                  className="btn btn-danger card-hover-actions"
                  onClick={() => handleRemove(p.id)}
                >
                  Remove
                </button>
              </div>
            );
          })}
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
      title="Add project"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving…" : "Add"}
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
        />
      </Field>
      <Field label="Description">
        <textarea
          className="textarea"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
