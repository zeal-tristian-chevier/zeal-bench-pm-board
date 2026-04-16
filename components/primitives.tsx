"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SWATCH_HEX } from "@/lib/theme";
import type { SwatchColor } from "@/lib/types";
import { SWATCHES } from "@/lib/types";

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: color,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

export function Chip({
  children,
  color,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className="chip"
      style={{
        ...(color
          ? {
              background: `color-mix(in oklab, ${color} 14%, var(--surface))`,
              borderColor: `color-mix(in oklab, ${color} 35%, var(--border))`,
              color: `color-mix(in oklab, ${color} 90%, var(--text))`,
            }
          : {}),
        ...style,
      }}
    >
      {color ? <span className="chip-dot" style={{ background: color }} /> : null}
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
        </div>
        {footer ? (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="label">{label}</div>
      {children}
    </div>
  );
}

export function SwatchPicker({
  value,
  onChange,
}: {
  value: SwatchColor;
  onChange: (c: SwatchColor) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={c}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: SWATCH_HEX[c],
            border:
              value === c
                ? "2px solid var(--text)"
                : "2px solid transparent",
            cursor: "pointer",
            padding: 0,
          }}
        />
      ))}
    </div>
  );
}

export function MultiChipPicker<T extends { id: string; label: string; color?: string }>({
  options,
  value,
  onChange,
  placeholder = "Select…",
}: {
  options: T[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {value.length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>
            {placeholder}
          </span>
        ) : null}
        {value.map((id) => {
          const opt = options.find((o) => o.id === id);
          if (!opt) return null;
          return (
            <Chip key={id} color={opt.color}>
              {opt.label}
              <button
                className="icon-btn"
                style={{ width: 16, height: 16 }}
                onClick={() => toggle(id)}
                aria-label={`Remove ${opt.label}`}
                type="button"
              >
                <svg width="10" height="10" viewBox="0 0 16 16">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </Chip>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: 6,
          border: "1px dashed var(--border)",
          borderRadius: 6,
        }}
      >
        {options.map((o) => {
          const selected = value.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              className="chip"
              onClick={() => toggle(o.id)}
              style={{
                cursor: "pointer",
                opacity: selected ? 0.45 : 1,
                background: selected ? "var(--surface-2)" : "var(--surface)",
              }}
            >
              {o.color ? (
                <span className="chip-dot" style={{ background: o.color }} />
              ) : null}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DropdownButton({
  label,
  active,
  accent,
  children,
}: {
  label: ReactNode;
  active: boolean;
  accent?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        className="btn"
        onClick={() => setOpen((v) => !v)}
        style={{ position: "relative", paddingBottom: active ? 6 : 6 }}
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          style={{ marginLeft: 2, opacity: 0.6 }}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        {active ? (
          <span
            style={{
              position: "absolute",
              left: 8,
              right: 8,
              bottom: -1,
              height: 2,
              background: accent ?? "var(--accent)",
              borderRadius: 2,
            }}
          />
        ) : null}
      </button>
      {open ? <div className="dropdown">{children(() => setOpen(false))}</div> : null}
    </div>
  );
}
