"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SWATCH_HEX } from "@/lib/theme";
import type { SwatchColor } from "@/lib/types";
import { SWATCHES } from "@/lib/types";

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
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
  variant = "tonal",
  style,
}: {
  children: ReactNode;
  color?: string;
  variant?: "tonal" | "ghost" | "solid";
  style?: React.CSSProperties;
}) {
  const tonal = color
    ? {
        background: `color-mix(in oklab, ${color} 14%, var(--surface-lowest))`,
        color: `color-mix(in oklab, ${color} 80%, var(--on-primary-fixed))`,
      }
    : {};
  const solid = color
    ? {
        background: color,
        color: "#fff",
      }
    : {};
  const ghost = {
    background: "var(--surface-high)",
    color: "var(--on-surface-variant)",
  };
  return (
    <span
      className="chip"
      style={{
        ...(variant === "solid" ? solid : variant === "ghost" ? ghost : tonal),
        ...style,
      }}
    >
      {color && variant === "tonal" ? (
        <span className="chip-dot" style={{ background: color }} />
      ) : null}
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
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

  const maxWidth = size === "lg" ? 780 : 560;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth }}
      >
        <div
          style={{
            padding: "22px 28px 18px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            {eyebrow ? (
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                {eyebrow}
              </div>
            ) : null}
            <div
              className="headline"
              style={{
                fontSize: 22,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {title}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? (
          <div
            style={{
              padding: "16px 28px 22px",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              borderTop: "1px solid var(--ghost-border)",
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
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="label">{label}</div>
      {children}
      {hint ? (
        <div
          style={{
            fontSize: 11,
            color: "var(--on-surface-subtle)",
          }}
        >
          {hint}
        </div>
      ) : null}
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
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={c}
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: SWATCH_HEX[c],
            boxShadow:
              value === c
                ? "0 0 0 2px var(--surface-lowest), 0 0 0 4px var(--on-primary-fixed)"
                : "0 0 0 1px var(--ghost-border)",
            border: "none",
            cursor: "pointer",
            padding: 0,
            transition: "transform 0.12s ease",
          }}
        />
      ))}
    </div>
  );
}

export function MultiChipPicker<
  T extends { id: string; label: string; color?: string },
>({
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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 22 }}>
        {value.length === 0 ? (
          <span
            style={{ fontSize: 12, color: "var(--on-surface-subtle)" }}
          >
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
                style={{ width: 16, height: 16, color: "currentColor" }}
                onClick={() => toggle(id)}
                aria-label={`Remove ${opt.label}`}
                type="button"
              >
                <svg width="9" height="9" viewBox="0 0 16 16">
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
          padding: 10,
          background: "var(--surface-low)",
          borderRadius: "var(--radius)",
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
                background: selected
                  ? "var(--surface-highest)"
                  : "var(--surface-lowest)",
                color: "var(--on-primary-fixed)",
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
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        className="btn btn-sm"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: active ? "var(--surface-container)" : "var(--surface-low)",
          color: active ? "var(--on-primary-fixed)" : "var(--on-surface-variant)",
          fontWeight: active ? 600 : 500,
        }}
      >
        {accent ? <Dot color={accent} size={8} /> : null}
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          style={{ marginLeft: 2, opacity: 0.55 }}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.75"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open ? <div className="dropdown scrollbar-thin">{children(() => setOpen(false))}</div> : null}
    </div>
  );
}
