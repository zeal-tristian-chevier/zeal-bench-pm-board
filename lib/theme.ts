import type {
  MemberStatus,
  Priority,
  ProjectStatus,
  SwatchColor,
} from "./types";

// Pigment-style palette — shifted toward ink colors for an editorial feel.
export const SWATCH_HEX: Record<SwatchColor, string> = {
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
};

export const PRIORITY_HEX: Record<Priority, string> = {
  Low: "#4a7c3e",
  Medium: "#c49140",
  High: "#b54a3e",
};

export const MEMBER_STATUS_HEX: Record<MemberStatus, string> = {
  Available: "#4a7c3e",
  "On Project": "#c49140",
  "Partially Available": "#2f6b62",
  Unavailable: "#b54a3e",
};

export const PROJECT_STATUS_HEX: Record<ProjectStatus, string> = {
  Planning: "#5e5a52",
  "In Progress": "#2d4a7c",
  "On Hold": "#c49140",
  Complete: "#4a7c3e",
  Cancelled: "#b54a3e",
};

export type DueBucket = "overdue" | "this-week" | "next-week" | "future" | "none";

export function dueBucket(date: string | null, today = new Date()): DueBucket {
  if (!date) return "none";
  const d = new Date(date + "T00:00:00");
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - t.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "this-week";
  if (diff <= 14) return "next-week";
  return "future";
}

export const DUE_HEX: Record<DueBucket, string> = {
  overdue: "#b54a3e",
  "this-week": "#c49140",
  "next-week": "#6b4b7c",
  future: "#4a7c3e",
  none: "#5e5a52",
};

export function formatDueDate(date: string | null): string {
  if (!date) return "No due date";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
