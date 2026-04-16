export type Priority = "Low" | "Medium" | "High";
export type ColumnKey = string;
export const DEFAULT_COLUMNS: string[] = ["To Do", "In Progress", "Done"];
export type ProjectStatus =
  | "Planning"
  | "In Progress"
  | "On Hold"
  | "Complete"
  | "Cancelled";
export type MemberStatus =
  | "Available"
  | "On Project"
  | "Partially Available"
  | "Unavailable";

export type SwatchColor =
  | "blue"
  | "teal"
  | "orange"
  | "violet"
  | "pink"
  | "green"
  | "red"
  | "amber"
  | "slate"
  | "cyan";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  color: SwatchColor;
  status: ProjectStatus;
  lead_id: string | null;
  created_at: string;
};

export type Member = {
  id: string;
  name: string;
  role: string;
  status: MemberStatus;
  avatar_color: SwatchColor;
  avatar_url: string | null;
  project_ids: string[];
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  priority: Priority;
  status_column: ColumnKey;
  due_date: string | null;
  project_id: string | null;
  position: number;
  assignee_ids: string[];
  created_at: string;
};

export const PRIORITIES: Priority[] = ["Low", "Medium", "High"];
export const PROJECT_STATUSES: ProjectStatus[] = [
  "Planning",
  "In Progress",
  "On Hold",
  "Complete",
  "Cancelled",
];
export const MEMBER_STATUSES: MemberStatus[] = [
  "Available",
  "On Project",
  "Partially Available",
  "Unavailable",
];
export const SWATCHES: SwatchColor[] = [
  "blue",
  "teal",
  "orange",
  "violet",
  "pink",
  "green",
  "red",
  "amber",
  "slate",
  "cyan",
];
