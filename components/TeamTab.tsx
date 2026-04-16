"use client";

import { useEffect, useState } from "react";
import type { BoardData } from "@/lib/data";
import {
  createMember,
  deleteMember,
  updateMember,
} from "@/lib/data";
import {
  MEMBER_STATUSES,
  type Member,
  type MemberStatus,
  type SwatchColor,
} from "@/lib/types";
import { MEMBER_STATUS_HEX, SWATCH_HEX, initialsOf } from "@/lib/theme";
import { Chip, Dot, Field, Modal, MultiChipPicker, SwatchPicker } from "./primitives";

export default function TeamTab({
  data,
  setMembers,
}: {
  data: BoardData;
  setMembers: (members: Member[]) => void;
}) {
  const { members, projects } = data;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  async function handleSave(input: {
    name: string;
    role: string;
    status: MemberStatus;
    avatar_color: SwatchColor;
    project_ids: string[];
  }) {
    const prev = members;
    if (editing) {
      setMembers(
        members.map((m) => (m.id === editing.id ? { ...m, ...input } : m)),
      );
      try {
        await updateMember(editing.id, input);
      } catch (err) {
        console.error(err);
        setMembers(prev);
      }
    } else {
      const optimistic: Member = {
        id: `tmp-${Date.now()}`,
        ...input,
        created_at: new Date().toISOString(),
      };
      setMembers([...members, optimistic]);
      try {
        const created = await createMember(input);
        setMembers([
          ...members,
          { ...optimistic, id: (created as { id: string }).id },
        ]);
      } catch (err) {
        console.error(err);
        setMembers(prev);
      }
    }
    setOpen(false);
    setEditing(null);
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this team member?")) return;
    const prev = members;
    setMembers(members.filter((m) => m.id !== id));
    try {
      await deleteMember(id);
    } catch (err) {
      console.error(err);
      setMembers(prev);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {MEMBER_STATUSES.map((s) => (
            <Chip key={s} color={MEMBER_STATUS_HEX[s]}>
              {s}
            </Chip>
          ))}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          + Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <div
          className="surface"
          style={{
            padding: 24,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          No team members yet. Add your first one.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {members.map((m) => {
            const memberProjects = projects.filter((p) =>
              m.project_ids.includes(p.id),
            );
            return (
              <div
                key={m.id}
                className="surface card"
                style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    className="avatar"
                    style={{
                      width: 40,
                      height: 40,
                      fontSize: 13,
                      background: SWATCH_HEX[m.avatar_color],
                      border: "none",
                    }}
                  >
                    {initialsOf(m.name)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {m.role}
                    </div>
                  </div>
                  <div className="card-hover-actions" style={{ display: "flex", gap: 2 }}>
                    <button
                      className="icon-btn"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(m);
                        setOpen(true);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z"
                          stroke="currentColor"
                          strokeWidth="1.25"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      className="icon-btn"
                      data-danger="true"
                      aria-label="Remove"
                      onClick={() => handleRemove(m.id)}
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4l.5 9h5L11 4"
                          stroke="currentColor"
                          strokeWidth="1.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <Chip color={MEMBER_STATUS_HEX[m.status]}>{m.status}</Chip>

                {memberProjects.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {memberProjects.map((p) => (
                      <Chip key={p.id} color={SWATCH_HEX[p.color]}>
                        {p.name}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>
                    Not assigned to any projects
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <MemberModal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        member={editing}
        projects={projects}
        onSave={handleSave}
      />
    </div>
  );
}

function MemberModal({
  open,
  onClose,
  member,
  projects,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  member: Member | null;
  projects: BoardData["projects"];
  onSave: (input: {
    name: string;
    role: string;
    status: MemberStatus;
    avatar_color: SwatchColor;
    project_ids: string[];
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<MemberStatus>("Available");
  const [avatarColor, setAvatarColor] = useState<SwatchColor>("blue");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(member?.name ?? "");
      setRole(member?.role ?? "");
      setStatus(member?.status ?? "Available");
      setAvatarColor(member?.avatar_color ?? "blue");
      setProjectIds(member?.project_ids ?? []);
    }
  }, [open, member]);

  async function submit() {
    if (!name.trim() || !role.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        role: role.trim(),
        status,
        avatar_color: avatarColor,
        project_ids: projectIds,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? "Edit member" : "Add team member"}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving || !name.trim() || !role.trim()}
          >
            {saving ? "Saving…" : member ? "Save" : "Add"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Name">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Role">
          <input
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Full Stack Dev"
          />
        </Field>
      </div>

      <Field label="Status">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {MEMBER_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className="chip"
              style={{
                cursor: "pointer",
                borderColor:
                  status === s
                    ? `color-mix(in oklab, ${MEMBER_STATUS_HEX[s]} 60%, var(--border))`
                    : undefined,
                background:
                  status === s
                    ? `color-mix(in oklab, ${MEMBER_STATUS_HEX[s]} 18%, var(--surface))`
                    : undefined,
              }}
            >
              <Dot color={MEMBER_STATUS_HEX[s]} />
              {s}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Avatar color">
        <div
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          <span
            className="avatar"
            style={{
              width: 36,
              height: 36,
              fontSize: 12,
              background: SWATCH_HEX[avatarColor],
              border: "none",
            }}
          >
            {initialsOf(name || "NA")}
          </span>
          <SwatchPicker value={avatarColor} onChange={setAvatarColor} />
        </div>
      </Field>

      <Field label="Projects">
        <MultiChipPicker
          options={projects.map((p) => ({
            id: p.id,
            label: p.name,
            color: SWATCH_HEX[p.color],
          }))}
          value={projectIds}
          onChange={setProjectIds}
          placeholder="No projects assigned"
        />
      </Field>
    </Modal>
  );
}
