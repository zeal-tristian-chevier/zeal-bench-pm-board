import type {
  MemberStatus,
  Priority,
  ProjectStatus,
  SwatchColor,
} from "./types";

export const SWATCH_HEX: Record<SwatchColor, string> = {
  blue: "#3b82f6",
  teal: "#14b8a6",
  orange: "#f97316",
  violet: "#8b5cf6",
  pink: "#ec4899",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  slate: "#64748b",
  cyan: "#06b6d4",
};

export const PRIORITY_HEX: Record<Priority, string> = {
  Low: "#22c55e",
  Medium: "#f59e0b",
  High: "#ef4444",
};

export const MEMBER_STATUS_HEX: Record<MemberStatus, string> = {
  Available: "#22c55e",
  "On Project": "#f59e0b",
  "Partially Available": "#14b8a6",
  Unavailable: "#ef4444",
};

export const PROJECT_STATUS_HEX: Record<ProjectStatus, string> = {
  Planning: "#64748b",
  "In Progress": "#3b82f6",
  "On Hold": "#f59e0b",
  Complete: "#22c55e",
  Cancelled: "#ef4444",
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
  overdue: "#ef4444",
  "this-week": "#f59e0b",
  "next-week": "#8b5cf6",
  future: "#22c55e",
  none: "#64748b",
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
