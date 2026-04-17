"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { BoardData } from "@/lib/data";
import { createTask, deleteTask, updateTask } from "@/lib/data";
import {
  DEFAULT_COLUMNS,
  PRIORITIES,
  type ColumnKey,
  type Priority,
  type Project,
  type Task,
} from "@/lib/types";
import {
  DUE_HEX,
  PRIORITY_HEX,
  SWATCH_HEX,
  dueBucket,
  formatDueDate,
  initialsOf,
  type DueBucket,
} from "@/lib/theme";
import {
  Chip,
  Dot,
  DropdownButton,
  Field,
  Modal,
  MultiChipPicker,
} from "./primitives";

type DueFilter = "all" | DueBucket;

const DEFAULT_ACCENTS: Record<string, string> = {
  "To Do": "var(--primary-tint)",
  "In Progress": "var(--secondary)",
  Done: "var(--success)",
};

const CUSTOM_ACCENT_PALETTE = [
  "#6b4b7c",
  "#3d7d8c",
  "#c49140",
  "#4a7c3e",
  "#b5567b",
  "#2f6b62",
  "#c26a45",
  "#2d4a7c",
];

function accentForColumn(col: ColumnKey, fallbackIndex: number): string {
  if (DEFAULT_ACCENTS[col]) return DEFAULT_ACCENTS[col];
  return CUSTOM_ACCENT_PALETTE[fallbackIndex % CUSTOM_ACCENT_PALETTE.length];
}

const CUSTOM_COLS_KEY = "zeal-bench.custom-columns";

function loadCustomColumns(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_COLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function saveCustomColumns(cols: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_COLS_KEY, JSON.stringify(cols));
  } catch {
    /* ignore quota errors */
  }
}

export default function BoardTab({
  data,
  setTasks,
}: {
  data: BoardData;
  setTasks: (tasks: Task[]) => void;
  setProjects: (projects: Project[]) => void;
}) {
  const { projects, members, tasks } = data;

  const [projectFilter, setProjectFilter] = useState<string | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string | "all">("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  useEffect(() => {
    setCustomColumns(loadCustomColumns());
  }, []);

  const columns = useMemo<ColumnKey[]>(() => {
    const fromTasks = new Set<string>();
    for (const t of tasks) if (t.status_column) fromTasks.add(t.status_column);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of [...DEFAULT_COLUMNS, ...customColumns, ...fromTasks]) {
      if (!seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return out;
  }, [customColumns, tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );
  const memberById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (projectFilter !== "all" && t.project_id !== projectFilter)
        return false;
      if (assigneeFilter !== "all" && !t.assignee_ids.includes(assigneeFilter))
        return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter)
        return false;
      if (dueFilter !== "all") {
        const b = dueBucket(t.due_date);
        if (dueFilter === "none" && b !== "none") return false;
        if (dueFilter !== "none" && b !== dueFilter) return false;
      }
      return true;
    });
  }, [tasks, projectFilter, assigneeFilter, priorityFilter, dueFilter]);

  const byColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const c of columns) map[c] = [];
    for (const t of filtered) {
      if (!map[t.status_column]) map[t.status_column] = [];
      map[t.status_column].push(t);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [filtered, columns]);

  const hasAnyFilter =
    projectFilter !== "all" ||
    assigneeFilter !== "all" ||
    dueFilter !== "all" ||
    priorityFilter !== "all";

  function clearFilters() {
    setProjectFilter("all");
    setAssigneeFilter("all");
    setDueFilter("all");
    setPriorityFilter("all");
  }

  function onDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = e;
    if (!over) return;
    const taskId = String(active.id);
    const targetCol = String(over.id) as ColumnKey;
    if (!columns.includes(targetCol)) return;
    const t = tasks.find((x) => x.id === taskId);
    if (!t || t.status_column === targetCol) return;
    const newPos =
      (tasks
        .filter((x) => x.status_column === targetCol)
        .reduce((m, x) => Math.max(m, x.position), -1) ?? -1) + 1;
    const next = tasks.map((x) =>
      x.id === taskId
        ? { ...x, status_column: targetCol, position: newPos }
        : x,
    );
    setTasks(next);
    try {
      await updateTask(taskId, { status_column: targetCol, position: newPos });
    } catch (err) {
      console.error(err);
      setTasks(tasks);
    }
  }

  async function handleCreate(input: {
    title: string;
    priority: Priority;
    status_column: ColumnKey;
    due_date: string | null;
    project_id: string | null;
    assignee_ids: string[];
  }) {
    const position =
      tasks
        .filter((x) => x.status_column === input.status_column)
        .reduce((m, x) => Math.max(m, x.position), -1) + 1;
    const optimistic: Task = {
      id: `tmp-${Date.now()}`,
      ...input,
      position,
      created_at: new Date().toISOString(),
    };
    setTasks([...tasks, optimistic]);
    try {
      const created = await createTask({ ...input, position });
      const taskId = (created as { id: string }).id;
      setTasks([...tasks, { ...optimistic, id: taskId }]);
    } catch (err) {
      console.error(err);
      setTasks(tasks);
    }
  }

  async function handleUpdate(id: string, patch: Partial<Task>) {
    const prev = tasks;
    setTasks(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      await updateTask(id, {
        title: patch.title,
        priority: patch.priority,
        status_column: patch.status_column,
        due_date: patch.due_date,
        project_id: patch.project_id,
        assignee_ids: patch.assignee_ids,
      });
    } catch (err) {
      console.error(err);
      setTasks(prev);
    }
  }

  async function handleDelete(id: string) {
    const prev = tasks;
    setTasks(tasks.filter((t) => t.id !== id));
    try {
      await deleteTask(id);
    } catch (err) {
      console.error(err);
      setTasks(prev);
    }
  }

  function submitNewColumn() {
    const trimmed = newColumnName.trim();
    if (!trimmed) return;
    if (columns.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setNewColumnName("");
      setAddingColumn(false);
      return;
    }
    const next = [...customColumns, trimmed];
    setCustomColumns(next);
    saveCustomColumns(next);
    setNewColumnName("");
    setAddingColumn(false);
  }

  function removeColumn(col: ColumnKey) {
    const hasTasks = tasks.some((t) => t.status_column === col);
    if (hasTasks) {
      alert(
        `"${col}" still has tasks. Move or delete them first before removing the column.`,
      );
      return;
    }
    const next = customColumns.filter((c) => c !== col);
    setCustomColumns(next);
    saveCustomColumns(next);
  }

  const isRemovable = (col: ColumnKey) =>
    !DEFAULT_COLUMNS.includes(col) &&
    !tasks.some((t) => t.status_column === col);

  const draggingTask = draggingId
    ? (tasks.find((t) => t.id === draggingId) ?? null)
    : null;

  return (
    <div>
      {/* Filter bar */}
      <div
        className="reveal"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          marginBottom: 28,
          padding: "14px 18px",
          background: "var(--surface-low)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <DropdownButton
          label={
            projectFilter === "all"
              ? "All Projects"
              : projectById.get(projectFilter)?.name ?? "Project"
          }
          active={projectFilter !== "all"}
          accent={
            projectFilter !== "all"
              ? SWATCH_HEX[projectById.get(projectFilter)?.color ?? "slate"]
              : undefined
          }
        >
          {(close) => (
            <>
              <FilterItem
                selected={projectFilter === "all"}
                onClick={() => {
                  setProjectFilter("all");
                  close();
                }}
              >
                All Projects
              </FilterItem>
              {projects.map((p) => (
                <FilterItem
                  key={p.id}
                  color={SWATCH_HEX[p.color]}
                  selected={projectFilter === p.id}
                  onClick={() => {
                    setProjectFilter(p.id);
                    close();
                  }}
                >
                  {p.name}
                </FilterItem>
              ))}
              <FilterItem
                color="#64748b"
                selected={projectFilter === ""}
                onClick={() => {
                  setProjectFilter("");
                  close();
                }}
              >
                No project
              </FilterItem>
            </>
          )}
        </DropdownButton>

        <DropdownButton
          label={
            assigneeFilter === "all"
              ? "All Assignees"
              : (memberById.get(assigneeFilter)?.name ?? "Assignee")
          }
          active={assigneeFilter !== "all"}
        >
          {(close) => (
            <>
              <FilterItem
                selected={assigneeFilter === "all"}
                onClick={() => {
                  setAssigneeFilter("all");
                  close();
                }}
              >
                All Assignees
              </FilterItem>
              {members.map((m) => (
                <FilterItem
                  key={m.id}
                  color={SWATCH_HEX[m.avatar_color]}
                  selected={assigneeFilter === m.id}
                  onClick={() => {
                    setAssigneeFilter(m.id);
                    close();
                  }}
                >
                  {m.name}
                </FilterItem>
              ))}
            </>
          )}
        </DropdownButton>

        <DropdownButton
          label={
            dueFilter === "all" ? "All Due Dates" : dueFilterLabel(dueFilter)
          }
          active={dueFilter !== "all"}
          accent={dueFilter !== "all" ? DUE_HEX[dueFilter] : undefined}
        >
          {(close) => (
            <>
              <FilterItem
                selected={dueFilter === "all"}
                onClick={() => {
                  setDueFilter("all");
                  close();
                }}
              >
                All Due Dates
              </FilterItem>
              {(
                [
                  ["overdue", "Overdue"],
                  ["this-week", "Due This Week"],
                  ["next-week", "Due Next Week"],
                  ["none", "No Due Date"],
                ] as [DueFilter, string][]
              ).map(([key, label]) => (
                <FilterItem
                  key={key}
                  color={DUE_HEX[key as DueBucket]}
                  selected={dueFilter === key}
                  onClick={() => {
                    setDueFilter(key);
                    close();
                  }}
                >
                  {label}
                </FilterItem>
              ))}
            </>
          )}
        </DropdownButton>

        <DropdownButton
          label={priorityFilter === "all" ? "All Priorities" : priorityFilter}
          active={priorityFilter !== "all"}
          accent={
            priorityFilter !== "all" ? PRIORITY_HEX[priorityFilter] : undefined
          }
        >
          {(close) => (
            <>
              <FilterItem
                selected={priorityFilter === "all"}
                onClick={() => {
                  setPriorityFilter("all");
                  close();
                }}
              >
                All Priorities
              </FilterItem>
              {PRIORITIES.map((p) => (
                <FilterItem
                  key={p}
                  color={PRIORITY_HEX[p]}
                  selected={priorityFilter === p}
                  onClick={() => {
                    setPriorityFilter(p);
                    close();
                  }}
                >
                  {p}
                </FilterItem>
              ))}
            </>
          )}
        </DropdownButton>

        <div style={{ flex: 1 }} />

        <span
          style={{
            fontSize: 12,
            color: "var(--on-surface-subtle)",
            fontWeight: 500,
          }}
        >
          <span
            style={{
              color: "var(--on-primary-fixed)",
              fontWeight: 700,
              fontSize: 15,
              marginRight: 6,
              letterSpacing: "-0.02em",
            }}
          >
            {filtered.length}
          </span>
          {filtered.length === 1 ? "entry" : "entries"}
          {hasAnyFilter ? " · filtered" : ""}
        </span>
        {hasAnyFilter ? (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
            Clear all
          </button>
        ) : null}
        {addingColumn ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitNewColumn();
            }}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <input
              autoFocus
              className="input"
              placeholder="Category name (e.g. Review)"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setAddingColumn(false);
                  setNewColumnName("");
                }
              }}
              style={{ width: 220 }}
            />
            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={!newColumnName.trim()}
            >
              Add
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => {
                setAddingColumn(false);
                setNewColumnName("");
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            className="btn btn-ghost"
            onClick={() => setAddingColumn(true)}
          >
            + New Category
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingTask(null);
            setModalOpen(true);
          }}
        >
          + New Task
        </button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div
          className="reveal scrollbar-thin"
          style={{
            overflow: "visible",
            paddingBottom: 8,
            animationDelay: "0.08s",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns.length}, minmax(300px, 1fr))`,
              gap: 24,
              alignItems: "stretch",
            }}
          >
            {columns.map((col, i) => (
              <Column
                key={col}
                column={col}
                accent={accentForColumn(col, i)}
                tasks={byColumn[col] ?? []}
                projects={projects}
                members={members}
                canRemove={isRemovable(col)}
                onRemove={() => removeColumn(col)}
                onOpenTask={(t) => {
                  setEditingTask(t);
                  setModalOpen(true);
                }}
                onDelete={handleDelete}
                onQuickAdd={(title) =>
                  handleCreate({
                    title,
                    priority: "Medium",
                    status_column: col,
                    due_date: null,
                    project_id: null,
                    assignee_ids: [],
                  })
                }
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {draggingTask ? (
            <TaskCard
              task={draggingTask}
              project={
                draggingTask.project_id
                  ? (projectById.get(draggingTask.project_id) ?? null)
                  : null
              }
              members={members}
              onEdit={() => {}}
              onDelete={() => {}}
              dragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        task={editingTask}
        projects={projects}
        members={members}
        availableColumns={columns}
        onCreate={async (input) => {
          await handleCreate(input);
          setModalOpen(false);
        }}
        onUpdate={async (id, patch) => {
          await handleUpdate(id, patch);
          setModalOpen(false);
        }}
      />
    </div>
  );
}

function FilterItem({
  children,
  color,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  color?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="dropdown-item"
      data-selected={selected}
      onClick={onClick}
      type="button"
    >
      {color ? <Dot color={color} /> : <span style={{ width: 10 }} />}
      <span style={{ flex: 1 }}>{children}</span>
      {selected ? (
        <svg width="12" height="12" viewBox="0 0 16 16">
          <path
            d="M3 8l3 3 7-7"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}

function dueFilterLabel(v: DueFilter) {
  switch (v) {
    case "overdue":
      return "Overdue";
    case "this-week":
      return "Due This Week";
    case "next-week":
      return "Due Next Week";
    case "none":
      return "No Due Date";
    case "future":
      return "Future";
    default:
      return "All Due Dates";
  }
}

function Column({
  column,
  accent,
  tasks,
  projects,
  members,
  canRemove,
  onRemove,
  onOpenTask,
  onDelete,
  onQuickAdd,
}: {
  column: ColumnKey;
  accent: string;
  tasks: Task[];
  projects: Project[];
  members: BoardData["members"];
  canRemove: boolean;
  onRemove: () => void;
  onOpenTask: (t: Task) => void;
  onDelete: (id: string) => void;
  onQuickAdd: (title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const isDone = column === "Done";

  const projectById = new Map(projects.map((p) => [p.id, p]));

  return (
    <div className="kanban-col" data-over={isOver} style={{ opacity: isDone ? 0.78 : 1 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: accent,
            }}
          />
          <h3
            style={{
              fontSize: 12.5,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--on-primary-fixed)",
            }}
          >
            {column}
          </h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: "3px 9px",
              borderRadius: 999,
              background: "var(--surface-high)",
              color: "var(--on-surface-variant)",
              letterSpacing: "0.03em",
            }}
          >
            {tasks.length}
          </span>
          {canRemove ? (
            <button
              className="icon-btn"
              data-danger="true"
              aria-label={`Remove ${column} column`}
              title="Remove column"
              onClick={onRemove}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      <div ref={setNodeRef} className="kanban-drop">
        {tasks.map((t) => (
          <DraggableCard
            key={t.id}
            task={t}
            project={
              t.project_id ? (projectById.get(t.project_id) ?? null) : null
            }
            members={members}
            onEdit={() => onOpenTask(t)}
            onDelete={() => onDelete(t.id)}
          />
        ))}
        {tasks.length === 0 ? (
          <div
            style={{
              padding: "20px 12px",
              textAlign: "center",
              fontSize: 11,
              color: "var(--on-surface-subtle)",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Drop tasks here
          </div>
        ) : null}
      </div>

      <div>
        {quickOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (quickTitle.trim()) {
                onQuickAdd(quickTitle.trim());
                setQuickTitle("");
                setQuickOpen(false);
              }
            }}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <input
              autoFocus
              className="input"
              placeholder="Task title…"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-sm" type="submit">
                Add
              </button>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => {
                  setQuickOpen(false);
                  setQuickTitle("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setQuickOpen(true)}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: 11,
              letterSpacing: "0.18em",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--on-surface-subtle)",
              background: "transparent",
              border: "2px dashed var(--ghost-border-strong)",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              transition: "color 0.15s ease, border-color 0.15s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "var(--on-primary-fixed)";
              e.currentTarget.style.borderColor = "var(--primary-tint)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "var(--on-surface-subtle)";
              e.currentTarget.style.borderColor = "var(--ghost-border-strong)";
            }}
          >
            + Add Task
          </button>
        )}
      </div>
    </div>
  );
}

function DraggableCard(props: {
  task: Task;
  project: Project | null;
  members: BoardData["members"];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.task.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0 : 1 }}
      {...attributes}
      {...listeners}
    >
      <TaskCard {...props} />
    </div>
  );
}

function TaskCard({
  task,
  project,
  members,
  onEdit,
  onDelete,
  dragging = false,
}: {
  task: Task;
  project: Project | null;
  members: BoardData["members"];
  onEdit: () => void;
  onDelete: () => void;
  dragging?: boolean;
}) {
  const bucket = dueBucket(task.due_date);
  const isOverdue = bucket === "overdue";
  const isDone = task.status_column === "Done";
  const isInProgress = task.status_column === "In Progress";
  const projectColor = project ? SWATCH_HEX[project.color] : null;
  const assignees = task.assignee_ids
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean) as BoardData["members"];

  const progress = isInProgress ? progressForTask(task) : null;

  return (
    <div
      className="task-card"
      data-overdue={isOverdue}
      style={{
        boxShadow: dragging
          ? "var(--shadow-float)"
          : undefined,
        transform: dragging ? "rotate(-1deg)" : undefined,
        paddingLeft: isOverdue ? 22 : 18,
      }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest(".icon-btn")) return;
        onEdit();
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Chip
          color={projectColor ?? "#64748b"}
          variant={isOverdue ? "solid" : "tonal"}
        >
          {project ? project.name : "Unassigned"}
        </Chip>
        <div className="card-hover-actions" style={{ display: "flex", gap: 2 }}>
          {isDone ? (
            <span style={{ color: "var(--success)", display: "inline-flex" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 14l-5-5 1.4-1.4L11 13.2l6.6-6.6L19 8l-8 8z" />
              </svg>
            </span>
          ) : null}
          <button
            className="icon-btn"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label="Edit"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
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
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this task?")) onDelete();
            }}
            aria-label="Delete"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
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
        className="task-title"
        style={{
          textDecoration: isDone ? "line-through" : "none",
          opacity: isDone ? 0.7 : 1,
        }}
      >
        {task.title}
      </div>

      {progress !== null ? (
        <div>
          <div className="progress">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {assignees.length > 0 ? (
            <div className="avatar-stack">
              {assignees.slice(0, 3).map((m) => (
                <span key={m.id} className="tt">
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={m.name}
                      referrerPolicy="no-referrer"
                      style={{
                        width: 26,
                        height: 26,
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
                        background: SWATCH_HEX[m.avatar_color],
                        width: 26,
                        height: 26,
                        fontSize: 9.5,
                      }}
                    >
                      {initialsOf(m.name)}
                    </span>
                  )}
                  <span className="tt-bubble">{m.name}</span>
                </span>
              ))}
              {assignees.length > 3 ? (
                <span className="tt">
                  <span
                    className="avatar"
                    style={{
                      background: "var(--surface-highest)",
                      color: "var(--on-primary-fixed)",
                      width: 26,
                      height: 26,
                      fontSize: 9.5,
                    }}
                  >
                    +{assignees.length - 3}
                  </span>
                  <span className="tt-bubble">
                    {assignees.slice(3).map((m) => m.name).join(", ")}
                  </span>
                </span>
              ) : null}
            </div>
          ) : (
            <span
              style={{
                fontSize: 11,
                color: "var(--on-surface-subtle)",
                fontStyle: "italic",
              }}
            >
              Unassigned
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {progress !== null ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "var(--on-primary-fixed)",
                letterSpacing: "0.04em",
              }}
            >
              {progress}%
            </span>
          ) : null}
          <DueDateBadge date={task.due_date} bucket={bucket} />
          <PriorityPip priority={task.priority} />
        </div>
      </div>
    </div>
  );
}

function DueDateBadge({
  date,
  bucket,
}: {
  date: string | null;
  bucket: DueBucket;
}) {
  if (!date) return null;
  const isOverdue = bucket === "overdue";
  const isSoon = bucket === "this-week";
  const color = DUE_HEX[bucket];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontWeight: 700,
        color: isOverdue ? "var(--secondary)" : color,
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span style={{ letterSpacing: "0.02em" }}>
        {isOverdue
          ? `Overdue · ${formatDueDate(date)}`
          : isSoon
            ? `Soon · ${formatDueDate(date)}`
            : formatDueDate(date)}
      </span>
    </span>
  );
}

function PriorityPip({ priority }: { priority: Priority }) {
  const color = PRIORITY_HEX[priority];
  const label = priority.slice(0, 1);
  return (
    <span
      title={`${priority} priority`}
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        background: `color-mix(in oklab, ${color} 18%, var(--surface-lowest))`,
        color: color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: 0,
      }}
    >
      {label}
    </span>
  );
}

function progressForTask(task: Task): number {
  let seed = 0;
  for (const ch of task.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return 20 + (seed % 65);
}

function TaskModal({
  open,
  onClose,
  task,
  projects,
  members,
  availableColumns,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  projects: Project[];
  members: BoardData["members"];
  availableColumns: ColumnKey[];
  onCreate: (input: {
    title: string;
    priority: Priority;
    status_column: ColumnKey;
    due_date: string | null;
    project_id: string | null;
    assignee_ids: string[];
  }) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Task>) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [column, setColumn] = useState<ColumnKey>("To Do");
  const [dueDate, setDueDate] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setPriority(task?.priority ?? "Medium");
      setColumn(task?.status_column ?? availableColumns[0] ?? "To Do");
      setDueDate(task?.due_date ?? "");
      setProjectId(task?.project_id ?? "");
      setAssigneeIds(task?.assignee_ids ?? []);
    }
  }, [open, task, availableColumns]);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        priority,
        status_column: column,
        due_date: dueDate || null,
        project_id: projectId || null,
        assignee_ids: assigneeIds,
      };
      if (task) {
        await onUpdate(task.id, payload);
      } else {
        await onCreate(payload);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={task ? `Task · ${task.priority} priority` : "New Entry"}
      title={task ? "Edit task" : "Compose task"}
      size="lg"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving || !title.trim()}
          >
            {saving ? "Saving…" : task ? "Save changes" : "Create task"}
          </button>
        </>
      }
    >
      <Field label="Title">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          autoFocus
        />
      </Field>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
      >
        <Field label="Priority">
          <select
            className="select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due date">
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Assignees">
        <MultiChipPicker
          options={members.map((m) => ({
            id: m.id,
            label: m.name,
            color: SWATCH_HEX[m.avatar_color],
          }))}
          value={assigneeIds}
          onChange={setAssigneeIds}
          placeholder="No assignees"
        />
      </Field>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
      >
        <Field label="Project">
          <select
            className="select"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Column">
          <select
            className="select"
            value={column}
            onChange={(e) => setColumn(e.target.value as ColumnKey)}
          >
            {availableColumns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
