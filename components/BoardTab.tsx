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
import {
  createTask,
  deleteTask,
  updateTask,
} from "@/lib/data";
import {
  COLUMNS,
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
import { Chip, Dot, DropdownButton, Field, Modal, MultiChipPicker } from "./primitives";

type DueFilter = "all" | DueBucket;

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
      if (projectFilter !== "all" && t.project_id !== projectFilter) return false;
      if (
        assigneeFilter !== "all" &&
        !t.assignee_ids.includes(assigneeFilter)
      )
        return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (dueFilter !== "all") {
        const b = dueBucket(t.due_date);
        if (dueFilter === "none" && b !== "none") return false;
        if (dueFilter !== "none" && b !== dueFilter) return false;
      }
      return true;
    });
  }, [tasks, projectFilter, assigneeFilter, priorityFilter, dueFilter]);

  const byColumn = useMemo(() => {
    const map: Record<ColumnKey, Task[]> = {
      "To Do": [],
      "In Progress": [],
      Done: [],
    };
    for (const t of filtered) map[t.status_column].push(t);
    for (const k of COLUMNS) {
      map[k].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [filtered]);

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
    if (!COLUMNS.includes(targetCol)) return;
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
      setTasks([
        ...tasks,
        { ...optimistic, id: taskId },
      ]);
    } catch (err) {
      console.error(err);
      setTasks(tasks);
    }
  }

  async function handleUpdate(
    id: string,
    patch: Partial<Task>,
  ) {
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

  const draggingTask = draggingId
    ? tasks.find((t) => t.id === draggingId) ?? null
    : null;

  return (
    <div>
      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <DropdownButton
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {projectFilter === "all" ? (
                "All Projects"
              ) : (
                <>
                  <Dot color={SWATCH_HEX[projectById.get(projectFilter)?.color ?? "slate"]} />
                  {projectById.get(projectFilter)?.name ?? "Project"}
                </>
              )}
            </span>
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
              : memberById.get(assigneeFilter)?.name ?? "Assignee"
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

        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {filtered.length} {filtered.length === 1 ? "task" : "tasks"}
          {hasAnyFilter ? " shown" : ""}
        </span>
        {hasAnyFilter ? (
          <button className="btn-ghost btn" onClick={clearFilters}>
            Clear all
          </button>
        ) : null}
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

      {/* Project color legend */}
      {projects.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            padding: "8px 10px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface)",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
            PROJECTS
          </span>
          {projects.map((p) => (
            <span
              key={p.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
              }}
            >
              <Dot color={SWATCH_HEX[p.color]} />
              {p.name}
            </span>
          ))}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <Dot color="#64748b" />
            No project
          </span>
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {COLUMNS.map((col) => (
            <Column
              key={col}
              column={col}
              tasks={byColumn[col]}
              projects={projects}
              members={members}
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
        <DragOverlay>
          {draggingTask ? (
            <TaskCard
              task={draggingTask}
              project={
                draggingTask.project_id
                  ? projectById.get(draggingTask.project_id) ?? null
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
  tasks,
  projects,
  members,
  onOpenTask,
  onDelete,
  onQuickAdd,
}: {
  column: ColumnKey;
  tasks: Task[];
  projects: Project[];
  members: BoardData["members"];
  onOpenTask: (t: Task) => void;
  onDelete: (id: string) => void;
  onQuickAdd: (title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");

  const projectById = new Map(projects.map((p) => [p.id, p]));

  return (
    <div ref={setNodeRef} className="kanban-col" data-over={isOver}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          padding: "0 2px",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {column}
          <span
            style={{
              color: "var(--text-subtle)",
              fontWeight: 400,
              marginLeft: 6,
            }}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tasks.map((t) => (
          <DraggableCard
            key={t.id}
            task={t}
            project={
              t.project_id ? projectById.get(t.project_id) ?? null : null
            }
            members={members}
            onEdit={() => onOpenTask(t)}
            onDelete={() => onDelete(t.id)}
          />
        ))}
      </div>

      <div style={{ marginTop: 8 }}>
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
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
          >
            <input
              autoFocus
              className="input"
              placeholder="Task title…"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-primary" type="submit">
                Add
              </button>
              <button
                className="btn btn-ghost"
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
            className="btn btn-ghost"
            style={{ width: "100%", justifyContent: "flex-start" }}
            onClick={() => setQuickOpen(true)}
          >
            + Add task
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
  const color = project ? SWATCH_HEX[project.color] : "#94a3b8";
  const bucket = dueBucket(task.due_date);
  const assignees = task.assignee_ids
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean) as BoardData["members"];

  return (
    <div
      className="task-card card"
      style={{
        borderLeftColor: color,
        boxShadow: dragging ? "0 8px 20px rgba(0,0,0,0.18)" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <Chip color={color}>{project ? project.name : "No project"}</Chip>
        <div className="card-hover-actions" style={{ display: "flex", gap: 2 }}>
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
                strokeWidth="1.25"
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
                strokeWidth="1.25"
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
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>
          {task.title}
        </div>
        {assignees.length > 0 ? (
          <div className="avatar-stack">
            {assignees.slice(0, 3).map((m) => (
              <span
                key={m.id}
                className="avatar"
                style={{ background: SWATCH_HEX[m.avatar_color] }}
                title={m.name}
              >
                {initialsOf(m.name)}
              </span>
            ))}
            {assignees.length > 3 ? (
              <span
                className="avatar"
                style={{ background: "var(--surface-3)", color: "var(--text)" }}
              >
                +{assignees.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="divider" />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <Chip color={PRIORITY_HEX[task.priority]}>{task.priority}</Chip>
        <Chip color={DUE_HEX[bucket]}>
          {bucket === "overdue"
            ? `Overdue · ${formatDueDate(task.due_date)}`
            : formatDueDate(task.due_date)}
        </Chip>
      </div>
    </div>
  );
}

function TaskModal({
  open,
  onClose,
  task,
  projects,
  members,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  projects: Project[];
  members: BoardData["members"];
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
      setColumn(task?.status_column ?? "To Do");
      setDueDate(task?.due_date ?? "");
      setProjectId(task?.project_id ?? "");
      setAssigneeIds(task?.assignee_ids ?? []);
    }
  }, [open, task]);

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
      title={task ? "Edit task" : "New task"}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving || !title.trim()}
          >
            {saving ? "Saving…" : task ? "Save" : "Create"}
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            {COLUMNS.map((c) => (
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
