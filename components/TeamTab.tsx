"use client";

import { useEffect, useState } from "react";
import type { BoardData } from "@/lib/data";
import { createMember, deleteMember, updateMember } from "@/lib/data";
import {
  MEMBER_STATUSES,
  type Member,
  type MemberStatus,
  type SwatchColor,
} from "@/lib/types";
import { MEMBER_STATUS_HEX, SWATCH_HEX, initialsOf } from "@/lib/theme";
import {
  Chip,
  Dot,
  Field,
  Modal,
  MultiChipPicker,
  SwatchPicker,
} from "./primitives";

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
        // Rethrow so the modal stays open and the caller can surface the error.
        throw err;
      }
    } else {
      const optimistic: Member = {
        id: `tmp-${Date.now()}`,
        ...input,
        avatar_url: null,
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
        throw err;
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
        className="reveal"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            alignItems: "center",
          }}
        >
          <span className="meta">Status Legend</span>
          {MEMBER_STATUSES.map((s) => (
            <span
              key={s}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--on-surface-variant)",
              }}
            >
              <Dot color={MEMBER_STATUS_HEX[s]} />
              {s}
            </span>
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
          className="surface-well"
          style={{
            padding: 48,
            textAlign: "center",
            color: "var(--on-surface-variant)",
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Bench Empty
          </div>
          <div style={{ fontSize: 15, marginBottom: 16 }}>
            No team members yet. Add your first producer.
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Add first member
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {members.map((m) => {
            const memberProjects = projects.filter((p) =>
              m.project_ids.includes(p.id),
            );
            return (
              <div
                key={m.id}
                className="surface-card"
                style={{
                  padding: 22,
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                  position: "relative",
                  overflow: "hidden",
                  transition: "box-shadow 0.18s ease, transform 0.18s ease",
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
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: 3,
                    background: SWATCH_HEX[m.avatar_color],
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={m.name}
                      referrerPolicy="no-referrer"
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 999,
                        objectFit: "cover",
                        boxShadow: "0 0 0 2px var(--surface-lowest)",
                        display: "block",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <span
                      className="avatar"
                      style={{
                        width: 48,
                        height: 48,
                        fontSize: 13,
                        background: SWATCH_HEX[m.avatar_color],
                      }}
                    >
                      {initialsOf(m.name)}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        letterSpacing: "-0.015em",
                        color: "var(--on-primary-fixed)",
                        lineHeight: 1.15,
                      }}
                    >
                      {m.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--on-surface-subtle)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginTop: 3,
                      }}
                    >
                      {m.role}
                    </div>
                  </div>
                  <div
                    className="card-hover-actions"
                    style={{ display: "flex", gap: 2 }}
                  >
                    <button
                      className="icon-btn"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(m);
                        setOpen(true);
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z"
                          stroke="currentColor"
                          strokeWidth="1.4"
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
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    background: "var(--surface-low)",
                    borderRadius: "var(--radius)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--on-surface-subtle)",
                    }}
                  >
                    Status
                  </span>
                  <Chip color={MEMBER_STATUS_HEX[m.status]}>{m.status}</Chip>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--on-surface-subtle)",
                      marginBottom: 10,
                    }}
                  >
                    Assignments
                  </div>
                  {memberProjects.length > 0 ? (
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                    >
                      {memberProjects.map((p) => (
                        <Chip key={p.id} color={SWATCH_HEX[p.color]}>
                          {p.name}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        fontStyle: "italic",
                        color: "var(--on-surface-subtle)",
                      }}
                    >
                      On the bench.
                    </div>
                  )}
                </div>
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
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(member?.name ?? "");
      setRole(member?.role ?? "");
      setStatus(member?.status ?? "Available");
      setAvatarColor(member?.avatar_color ?? "blue");
      setProjectIds(member?.project_ids ?? []);
      setSaveError(null);
    }
  }, [open, member]);

  async function submit() {
    if (!name.trim() || !role.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        name: name.trim(),
        role: role.trim(),
        status,
        avatar_color: avatarColor,
        project_ids: projectIds,
      });
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Couldn’t save changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={member ? "Edit Member" : "Bench Addition"}
      title={member ? member.name : "Add team member"}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving || !name.trim() || !role.trim()}
          >
            {saving ? "Saving…" : member ? "Save changes" : "Add member"}
          </button>
        </>
      }
    >
      {saveError ? (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius)",
            background:
              "color-mix(in oklab, var(--secondary) 16%, var(--surface-lowest))",
            color:
              "color-mix(in oklab, var(--secondary) 80%, var(--on-primary-fixed))",
            fontSize: 12.5,
            lineHeight: 1.5,
            boxShadow: "inset 0 0 0 1px var(--ghost-border)",
          }}
        >
          {saveError}
        </div>
      ) : null}

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
      >
        <Field label="Name">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Full name"
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
                background:
                  status === s
                    ? `color-mix(in oklab, ${MEMBER_STATUS_HEX[s]} 20%, var(--surface-lowest))`
                    : "var(--surface-lowest)",
                color: `color-mix(in oklab, ${MEMBER_STATUS_HEX[s]} 80%, var(--on-primary-fixed))`,
                boxShadow:
                  status === s
                    ? `inset 0 0 0 2px ${MEMBER_STATUS_HEX[s]}`
                    : "inset 0 0 0 1px var(--ghost-border)",
              }}
            >
              <Dot color={MEMBER_STATUS_HEX[s]} size={6} />
              {s}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Avatar color">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            className="avatar"
            style={{
              width: 44,
              height: 44,
              fontSize: 14,
              background: SWATCH_HEX[avatarColor],
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
