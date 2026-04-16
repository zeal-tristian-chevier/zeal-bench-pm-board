"use client";

import { useMemo, useState } from "react";
import { parseStandup, type ParsedTask } from "@/lib/parseStandup";
import { importStandup } from "@/lib/importStandup";

export default function ImportStandupModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed: ParsedTask[] = useMemo(() => parseStandup(raw), [raw]);

  const grouped = useMemo(() => {
    const map = new Map<string, ParsedTask[]>();
    for (const t of parsed) {
      const key = t.projectName ?? "Unassigned";
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [parsed]);

  async function handleImport() {
    setBusy(true);
    setError(null);
    try {
      await importStandup(parsed);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 860, maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "22px 28px",
            borderBottom: "1px solid var(--ghost-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              Standup Import
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "var(--on-primary-fixed)",
              }}
            >
              Paste bullet list → auto-create tasks
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            padding: "20px 28px",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
            <div className="label">Raw notes</div>
            <textarea
              className="textarea"
              placeholder={`Name — phrase; phrase; phrase.\nAnother Name — phrase; phrase.`}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              style={{
                flex: 1,
                minHeight: 360,
                resize: "none",
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                lineHeight: 1.55,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div
              className="label"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span>Preview</span>
              <span style={{ color: "var(--on-surface-subtle)" }}>
                {parsed.length} tasks · {grouped.length} groups
              </span>
            </div>
            <div
              className="scrollbar-thin"
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                paddingRight: 4,
              }}
            >
              {grouped.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--on-surface-subtle)",
                    padding: 20,
                    textAlign: "center",
                  }}
                >
                  Paste standup notes on the left to preview grouped tasks.
                </div>
              ) : (
                grouped.map(([project, tasks]) => (
                  <div
                    key={project}
                    className="surface-quiet"
                    style={{ padding: 12 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        className="chip"
                        style={{
                          background:
                            project === "Unassigned"
                              ? "var(--surface-high)"
                              : "var(--tertiary-fixed)",
                        }}
                      >
                        {project}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--on-surface-subtle)",
                        }}
                      >
                        {tasks.length}
                      </span>
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {tasks.map((t, i) => (
                        <li
                          key={i}
                          style={{
                            fontSize: 12.5,
                            lineHeight: 1.4,
                            display: "flex",
                            gap: 8,
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: "var(--on-surface-subtle)",
                              whiteSpace: "nowrap",
                              paddingTop: 1,
                              minWidth: 110,
                            }}
                          >
                            {t.memberName}
                          </span>
                          <span style={{ color: "var(--on-primary-fixed)" }}>
                            {t.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "16px 28px",
            borderTop: "1px solid var(--ghost-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--on-surface-subtle)" }}>
            New members + projects auto-created. Tasks default to{" "}
            <code>To Do</code> · <code>Low</code>.
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {error ? (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--secondary)",
                  padding: "6px 10px",
                  background: "var(--error-container)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {error}
              </span>
            ) : null}
            <button className="btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={busy || parsed.length === 0}
            >
              {busy ? "Importing…" : `Import ${parsed.length} tasks`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
