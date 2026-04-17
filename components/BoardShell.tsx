"use client";

import { useCallback, useEffect, useState } from "react";
import { loadAll, syncSelfAvatar, type BoardData } from "@/lib/data";
import { wipeMyData } from "@/lib/importStandup";
import type { Member, Project, Task } from "@/lib/types";
import { initialsOf } from "@/lib/theme";
import BoardTab from "./BoardTab";
import TeamTab from "./TeamTab";
import ProjectsTab from "./ProjectsTab";
import ImportStandupModal from "./ImportStandupModal";

type Tab = "Board" | "Projects" | "Team";

const TAB_META: Record<Tab, { eyebrow: string; title: string }> = {
  Board: {
    eyebrow: "Kinetic Flow",
    title: "Active Work",
  },
  Projects: {
    eyebrow: "Architectural Intelligence",
    title: "Studio Dashboard",
  },
  Team: {
    eyebrow: "The Bench · Personnel",
    title: "Your Collective",
  },
};

export default function BoardShell({
  userEmail,
  authUserId,
  avatarUrl,
  displayName,
}: {
  userEmail: string;
  authUserId: string;
  avatarUrl: string | null;
  displayName: string;
}) {
  const [tab, setTab] = useState<Tab>("Board");
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipeInput, setWipeInput] = useState("");

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
    (async () => {
      try {
        await syncSelfAvatar(authUserId, avatarUrl, displayName, userEmail);
      } catch {
        /* non-fatal */
      }
      await refresh();
    })();
  }, [refresh, authUserId, avatarUrl, displayName, userEmail]);

  const setProjects = useCallback((projects: Project[]) => {
    setData((d) => (d ? { ...d, projects } : d));
  }, []);
  const setMembers = useCallback((members: Member[]) => {
    setData((d) => (d ? { ...d, members } : d));
  }, []);
  const setTasks = useCallback((tasks: Task[]) => {
    setData((d) => (d ? { ...d, tasks } : d));
  }, []);

  async function handleWipeConfirmed() {
    if (wiping) return;
    setWiping(true);
    try {
      await wipeMyData();
      await refresh();
      setWipeOpen(false);
      setWipeInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wipe failed");
    } finally {
      setWiping(false);
    }
  }

  const meta = TAB_META[tab];
  const emailLocal = userEmail.split("@")[0];

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)" }}>
      {/* Top nav — sticky glass */}
      <header
        className="glass"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          borderBottom: "1px solid var(--ghost-border)",
        }}
      >
        <nav
          style={{
            maxWidth: 1600,
            margin: "0 auto",
            padding: "16px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                fontSize: 17,
                color: "var(--on-primary-fixed)",
              }}
            >
              <ZealMark />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
              {(["Board", "Projects", "Team"] as Tab[]).map((t) => (
                <button
                  key={t}
                  className="nav-tab"
                  data-active={tab === t}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              className="btn btn-sm"
              onClick={() => setImportOpen(true)}
            >
              Import Standup
            </button>
            <span
              style={{
                fontSize: 12,
                color: "var(--on-surface-subtle)",
                letterSpacing: "0.04em",
              }}
            >
              {userEmail}
            </span>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={emailLocal}
                referrerPolicy="no-referrer"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  objectFit: "cover",
                  boxShadow: "0 0 0 2px var(--surface-lowest)",
                  flexShrink: 0,
                  display: "block",
                }}
              />
            ) : (
              <span
                className="avatar"
                style={{
                  background: "var(--primary)",
                  width: 34,
                  height: 34,
                  fontSize: 12,
                }}
              >
                {initialsOf(emailLocal || "Z")}
              </span>
            )}
            <form action="/auth/signout" method="post">
              <button className="btn btn-sm" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>

      <main
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "44px 32px 96px",
        }}
      >
        {/* Page header */}
        <section
          className="reveal"
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
            marginBottom: 44,
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              {meta.eyebrow}
            </div>
            <h1
              style={{
                fontSize: 42,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "var(--on-primary-fixed)",
                lineHeight: 1,
                margin: 0,
              }}
            >
              {meta.title}
            </h1>
          </div>
          {data ? (
            <TeamAvatarStrip members={data.members} tab={tab} />
          ) : null}
        </section>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : data ? (
          <>
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

      {importOpen ? (
        <ImportStandupModal
          onClose={() => setImportOpen(false)}
          onDone={async () => {
            setImportOpen(false);
            await refresh();
          }}
        />
      ) : null}

      {wipeOpen ? (
        <WipeConfirmModal
          value={wipeInput}
          onChange={setWipeInput}
          onCancel={() => {
            if (wiping) return;
            setWipeOpen(false);
            setWipeInput("");
          }}
          onConfirm={handleWipeConfirmed}
          busy={wiping}
        />
      ) : null}
    </div>
  );
}

function WipeConfirmModal({
  value,
  onChange,
  onCancel,
  onConfirm,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const PHRASE = "delete everything";
  const match = value.trim().toLowerCase() === PHRASE;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "22px 28px 0",
          }}
        >
          <div
            className="eyebrow"
            style={{ marginBottom: 6, color: "var(--secondary)" }}
          >
            Destructive action
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--on-primary-fixed)",
              marginBottom: 10,
            }}
          >
            Clear the entire board?
          </div>
          <p
            style={{
              fontSize: 13.5,
              lineHeight: 1.5,
              color: "var(--on-surface-variant)",
              margin: 0,
            }}
          >
            Every project, member, and task on the shared board will be
            permanently deleted for everyone. This cannot be undone.
          </p>
        </div>

        <div className="modal-body" style={{ gap: 10 }}>
          <div className="label">
            Type <code>{PHRASE}</code> to confirm
          </div>
          <input
            className="input"
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={PHRASE}
            onKeyDown={(e) => {
              if (e.key === "Enter" && match && !busy) onConfirm();
              if (e.key === "Escape" && !busy) onCancel();
            }}
          />
        </div>

        <div
          style={{
            padding: "14px 28px 20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            borderTop: "1px solid var(--ghost-border)",
          }}
        >
          <button className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn btn-secondary"
            onClick={onConfirm}
            disabled={!match || busy}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ZealMark() {
  return (
    <img
      src="/zeal-logo.png"
      alt="Zeal"
      style={{
        height: 36,
        width: "auto",
        maxWidth: "none",
        flexShrink: 0,
        display: "block",
        objectFit: "contain",
      }}
    />
  );
}

function TeamAvatarStrip({
  members,
  tab,
}: {
  members: BoardData["members"];
  tab: Tab;
}) {
  if (members.length === 0) return null;
  const visible = members.slice(0, 4);
  const extra = Math.max(0, members.length - visible.length);

  const hexFor = (c: string) =>
    ({
      blue: "#2d4a7c",
      teal: "#2f6b62",
      orange: "#c26a45",
      violet: "#6b4b7c",
      pink: "#b5567b",
      green: "#4a7c3e",
      red: "#b54a3e",
      amber: "#c49140",
      slate: "#5e5a52",
      cyan: "#3d7d8c",
    })[c] || "#5e5a52";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ display: "flex" }}>
        {visible.map((m, i) =>
          m.avatar_url ? (
            <img
              key={m.id}
              src={m.avatar_url}
              alt={m.name}
              referrerPolicy="no-referrer"
              title={m.name}
              style={{
                marginLeft: i === 0 ? 0 : -10,
                width: 38,
                height: 38,
                borderRadius: 999,
                objectFit: "cover",
                boxShadow: "0 0 0 2px var(--surface-lowest)",
                display: "block",
                flexShrink: 0,
              }}
            />
          ) : (
            <span
              key={m.id}
              className="avatar"
              style={{
                background: hexFor(m.avatar_color),
                marginLeft: i === 0 ? 0 : -10,
                width: 38,
                height: 38,
                fontSize: 11,
              }}
              title={m.name}
            >
              {initialsOf(m.name)}
            </span>
          ),
        )}
        {extra > 0 ? (
          <span
            className="avatar"
            style={{
              background: "var(--surface-highest)",
              color: "var(--on-primary-fixed)",
              marginLeft: -10,
              width: 38,
              height: 38,
              fontSize: 11,
            }}
          >
            +{extra}
          </span>
        ) : null}
      </div>
      <div
        style={{
          width: 1,
          height: 36,
          background: "var(--ghost-border-strong)",
        }}
      />
      <div style={{ textAlign: "right" }}>
        <div className="meta" style={{ marginBottom: 4 }}>
          {tab === "Team" ? "Bench Size" : "Active Members"}
        </div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "var(--on-primary-fixed)",
            letterSpacing: "-0.01em",
          }}
        >
          {members.length} {members.length === 1 ? "Producer" : "Producers"}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="surface-well" style={{ padding: 48, textAlign: "center" }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Composing
      </div>
      <div
        style={{
          fontSize: 15,
          color: "var(--on-surface-variant)",
        }}
      >
        Loading your ledger…
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="surface-card"
      style={{
        padding: 28,
        borderLeft: "4px solid var(--secondary)",
      }}
    >
      <div
        className="headline"
        style={{ fontSize: 20, marginBottom: 8 }}
      >
        Couldn&apos;t load board data
      </div>
      <div
        style={{
          color: "var(--on-surface-variant)",
          fontSize: 14,
          marginBottom: 12,
        }}
      >
        {message}
      </div>
      <div
        style={{
          color: "var(--on-surface-subtle)",
          fontSize: 12.5,
          lineHeight: 1.55,
        }}
      >
        Make sure the Supabase schema has been applied and that the Google
        provider is enabled. See <code>supabase/schema.sql</code>.
      </div>
    </div>
  );
}

