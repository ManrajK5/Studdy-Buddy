"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { batchCreateGoogleCalendarEvents } from "@/lib/googleCalendar";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import {
  loadReminderMinutes,
  REMINDER_OPTIONS,
  saveReminderMinutes,
  type ReminderMinutes,
} from "@/lib/reminderPrefs";
import {
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  Trash2,
  GripVertical,
  Pencil,
  X,
  Loader2,
  Filter,
  ArrowUpDown,
} from "lucide-react";

type TaskType = "quiz" | "assignment" | "exam" | "lecture";

type TaskStatus = "upcoming" | "in-progress" | "completed";

type TaskItem = {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  date: string;
  detail: string;
  subtasks?: Array<{ title: string; eta: string }>;
};

type AssignmentRow = {
  id: string;
  title: string;
  type: "quiz" | "assignment" | "exam" | string;
  status?: TaskStatus | string | null;
  due_date: string | null;
  description: string | null;
  completed_at: string | null;
  subtasks: Array<{ title: string; eta: string }> | null;
};

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "upcoming" || value === "in-progress" || value === "completed";
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "number" || typeof err === "boolean" || err == null) {
    return String(err);
  }
  if (typeof err === "object") {
    const maybe = err as { message?: unknown; error?: unknown; details?: unknown; hint?: unknown };
    if (typeof maybe.message === "string") return maybe.message;
    if (typeof maybe.error === "string") return maybe.error;
    try {
      return JSON.stringify(err);
    } catch {
      return "Unknown error";
    }
  }
  return "Unknown error";
}

function isMissingStatusColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const maybe = err as { code?: unknown; message?: unknown };
  const code = typeof maybe.code === "string" ? maybe.code : "";
  const message = typeof maybe.message === "string" ? maybe.message : "";

  if (code === "42703") return true;
  // PostgREST schema cache error (common right after adding a column, or when migration isn't applied).
  if (code === "PGRST204") return true;
  const m = message.toLowerCase();
  return (
    (m.includes("column") && m.includes("status") && m.includes("does not exist")) ||
    (m.includes("schema cache") && m.includes("status") && m.includes("assignments"))
  );
}

const badgeStyles: Record<TaskType, string> = {
  quiz: "bg-blue-100 text-blue-700",
  assignment: "bg-amber-100 text-amber-700",
  exam: "bg-rose-100 text-rose-700",
  lecture: "bg-emerald-100 text-emerald-700",
};

const badgeLetters: Record<TaskType, string> = {
  quiz: "Q",
  assignment: "A",
  exam: "E",
  lecture: "L",
};

function formatRelativeDate(dateStr: string): { text: string; urgent: boolean; overdue: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return { text: `Overdue by ${abs} day${abs === 1 ? "" : "s"}`, urgent: true, overdue: true };
  }
  if (diffDays === 0) {
    return { text: "Due today", urgent: true, overdue: false };
  }
  if (diffDays === 1) {
    return { text: "Due tomorrow", urgent: true, overdue: false };
  }
  if (diffDays <= 7) {
    return { text: `Due in ${diffDays} days`, urgent: true, overdue: false };
  }
  return { text: dateStr, urgent: false, overdue: false };
}

const columns = [
  { id: "upcoming", label: "Upcoming" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
] as const satisfies ReadonlyArray<{ id: TaskStatus; label: string }>;

function DroppableColumn({
  id,
  children,
  empty,
}: {
  id: TaskStatus;
  children: React.ReactNode;
  empty: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={
        "min-h-[120px] rounded-3xl transition-colors " +
        (isOver ? "bg-slate-50 ring-2 ring-slate-200" : "bg-transparent")
      }
    >
      {children}

      {empty ? (
        <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-white p-5 text-center text-xs text-slate-400">
          Drop a task here
        </div>
      ) : null}
    </div>
  );
}

function DraggableTaskCard({
  task,
  isOpen,
  isSelected,
  onToggleOpen,
  onToggleSelected,
  onChangeStatus,
  onEdit,
}: {
  task: TaskItem;
  isOpen: boolean;
  isSelected: boolean;
  onToggleOpen: () => void;
  onToggleSelected: (next: boolean) => void;
  onChangeStatus: (next: TaskStatus) => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onToggleOpen}
      className={
        "w-full will-change-transform rounded-3xl border border-slate-100 bg-white px-5 py-4 text-left shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md " +
        (isDragging ? "opacity-0 shadow-none hover:shadow-none" : "")
      }
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="mt-0.5 rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            aria-label={`Drag task: ${task.title}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggleSelected(e.target.checked)}
            onClick={(e) => {
              e.stopPropagation();
            }}
            aria-label={`Select task: ${task.title}`}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900"
          />

          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">{task.title}</div>
            {(() => {
              const rel = formatRelativeDate(task.date);
              // Hide overdue warning for completed tasks
              const isCompleted = task.status === "completed";
              const showOverdue = rel.overdue && !isCompleted;
              const showUrgent = rel.urgent && !isCompleted;
              return (
                <div className="mt-1 flex items-center gap-1.5 text-xs flex-wrap">
                  <span
                    className={
                      showOverdue
                        ? "font-medium text-rose-600"
                        : showUrgent
                          ? "font-medium text-amber-600"
                          : "text-slate-500"
                    }
                  >
                    {isCompleted && rel.overdue ? "Completed" : rel.text}
                  </span>
                  {task.detail ? (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">{task.detail}</span>
                    </>
                  ) : null}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${badgeStyles[task.type]}`}
            title={task.type}
          >
            {badgeLetters[task.type]}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>

      {isOpen ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            Edit task
          </button>

          <select
            value={task.status}
            onChange={(e) => onChangeStatus(e.target.value as TaskStatus)}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="h-8 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
          >
            <option value="upcoming">Upcoming</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      ) : null}
    </div>
  );
}

export function TasksBoard() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  // Filters + Sort
  const [filterType, setFilterType] = useState<"all" | TaskType>("all");
  const [filterDue, setFilterDue] = useState<"all" | "week" | "overdue">("all");
  const [sortBy, setSortBy] = useState<"due" | "added">("due");

  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState<ReminderMinutes>(1440);

  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<Extract<TaskType, "quiz" | "assignment" | "exam">>(
    "assignment",
  );
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const supabase = createBrowserSupabaseClient();
      let data: AssignmentRow[] | null = null;
      let error: unknown = null;

      {
        const res = await supabase
          .from("assignments")
          .select("id,title,type,status,due_date,description,completed_at,subtasks")
          .order("due_date", { ascending: true });
        data = res.data as AssignmentRow[] | null;
        error = res.error;
      }

      if (error && isMissingStatusColumnError(error)) {
        const res = await supabase
          .from("assignments")
          .select("id,title,type,due_date,description,completed_at,subtasks")
          .order("due_date", { ascending: true });
        data = res.data as AssignmentRow[] | null;
        error = res.error;
      }

      if (error) throw error;

      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);

      const mapped: TaskItem[] = (data ?? []).map((row: AssignmentRow) => {
        const hasCompleted = Boolean(row.completed_at);
        const date = row.due_date ?? todayKey;

        let derived: TaskItem["status"] = "upcoming";
        if (hasCompleted) derived = "completed";
        else if (date < todayKey) derived = "in-progress";

        const stored = isTaskStatus(row.status) ? row.status : null;
        const status = hasCompleted ? "completed" : stored ?? derived;

        return {
          id: row.id,
          title: row.title,
          type: (row.type as TaskType) ?? "assignment",
          status,
          date,
          detail: row.description ?? "",
          subtasks: row.subtasks ?? undefined,
        };
      });

      setTasks(mapped);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    setReminderMinutes(loadReminderMinutes());
  }, []);

  useEffect(() => {
    const onChanged = () => loadTasks();
    window.addEventListener("study-buddy:tasks-changed", onChanged);
    return () => window.removeEventListener("study-buddy:tasks-changed", onChanged);
  }, [loadTasks]);

  useEffect(() => {
    // Drop selections for tasks that no longer exist (e.g., after reload/deletes).
    setSelected((prev) => {
      if (!tasks.length) return {};
      const allowed = new Set(tasks.map((t) => t.id));
      const next: Record<string, boolean> = {};
      for (const [id, on] of Object.entries(prev)) {
        if (on && allowed.has(id)) next[id] = true;
      }
      return next;
    });
  }, [tasks]);

  const counts = useMemo(() => {
    return {
      quizzes: tasks.filter((t) => t.type === "quiz").length,
      assignments: tasks.filter((t) => t.type === "assignment").length,
      exams: tasks.filter((t) => t.type === "exam").length,
    };
  }, [tasks]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    return tasks.filter((t) => {
      // Type filter
      if (filterType !== "all" && t.type !== filterType) return false;

      // Due filter
      if (filterDue !== "all") {
        const due = new Date(t.date + "T00:00:00");
        if (filterDue === "overdue" && due >= today) return false;
        if (filterDue === "week" && (due < today || due > weekFromNow)) return false;
      }

      return true;
    });
  }, [tasks, filterType, filterDue]);

  // Sort
  const sortedTasks = useMemo(() => {
    const copy = [...filteredTasks];
    if (sortBy === "due") {
      copy.sort((a, b) => a.date.localeCompare(b.date));
    }
    // "added" order is default from Supabase
    return copy;
  }, [filteredTasks, sortBy]);

  const grouped = useMemo(() => {
    const out: Record<TaskStatus, TaskItem[]> = {
      upcoming: [],
      "in-progress": [],
      completed: [],
    };
    for (const t of sortedTasks) out[t.status].push(t);
    return out;
  }, [sortedTasks]);

  const selectedIds = useMemo(() => {
    return Object.entries(selected)
      .filter(([, on]) => on)
      .map(([id]) => id);
  }, [selected]);

  const allSelected = useMemo(() => {
    if (!tasks.length) return false;
    return selectedIds.length === tasks.length;
  }, [selectedIds.length, tasks.length]);

  async function onSyncAll() {
    if (syncingCalendar) return;
    setSyncingCalendar(true);
    setStatus(null);
    let accessToken: string | null = null;

    try {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getSession();
      accessToken = (data.session as unknown as { provider_token?: string })
        ?.provider_token ?? null;
    } catch {
      accessToken = null;
    }

    if (!accessToken) {
      setStatus("Sign in with Google to enable calendar sync.");
      setSyncingCalendar(false);
      return;
    }

    try {
      const events = tasks
        .filter((t) => t.status !== "completed")
        .map((t) => ({
          title: t.title,
          type: t.type === "lecture" ? "assignment" : t.type,
          date: t.date,
          description: t.detail,
        }));

      await batchCreateGoogleCalendarEvents({ accessToken, events, reminderMinutes });
      setStatus(`Synced ${events.length} events to Google Calendar.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncingCalendar(false);
    }
  }

  async function updateStatus(taskId: string, next: TaskStatus) {
    const prevTasks = tasks;
    setStatus(null);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: next } : t)));

    try {
      const supabase = createBrowserSupabaseClient();
      const completedAt = next === "completed" ? new Date().toISOString() : null;

      {
        const res = await supabase
          .from("assignments")
          .update({ status: next, completed_at: completedAt })
          .eq("id", taskId);

        if (res.error && isMissingStatusColumnError(res.error)) {
          const fallbackRes = await supabase
            .from("assignments")
            .update({ completed_at: completedAt })
            .eq("id", taskId);
          if (fallbackRes.error) throw fallbackRes.error;

          setStatus("Status column missing in DB — apply migration 003 to persist status.");
        } else if (res.error) {
          throw res.error;
        }
      }
    } catch (e) {
      setTasks(prevTasks);
      setStatus(toErrorMessage(e) || "Update failed.");
    }
  }

  async function deleteSelectedTasks() {
    const ids = selectedIds;
    if (ids.length === 0) return;

    const ok = confirm(`Delete ${ids.length} selected task(s)?`);
    if (!ok) return;

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("assignments").delete().in("id", ids);
      if (error) throw error;

      setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
      setExpanded((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
      setSelected({});
      window.dispatchEvent(new Event("study-buddy:tasks-changed"));
    } catch (e) {
      setStatus(toErrorMessage(e) || "Bulk delete failed.");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);

    const taskId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) return;
    if (!isTaskStatus(overId)) return;

    const existing = tasks.find((t) => t.id === taskId);
    if (!existing) return;
    if (existing.status === overId) return;

    await updateStatus(taskId, overId);
  }

  function handleDragCancel() {
    setActiveDragId(null);
  }

  const activeTask = useMemo(() => {
    if (!activeDragId) return null;
    return tasks.find((t) => t.id === activeDragId) ?? null;
  }, [activeDragId, tasks]);

  const editingTask = useMemo(() => {
    if (!editTaskId) return null;
    return tasks.find((t) => t.id === editTaskId) ?? null;
  }, [editTaskId, tasks]);

  function openEdit(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setEditTaskId(taskId);
    setEditTitle(task.title);
    setEditType(task.type === "lecture" ? "assignment" : (task.type as "quiz" | "assignment" | "exam"));
    setEditDueDate(task.date);
    setEditDescription(task.detail);
    setEditError(null);
  }

  function closeEdit() {
    if (editSaving) return;
    setEditTaskId(null);
    setEditError(null);
  }

  async function saveEdit() {
    if (!editTaskId) return;
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditError("Title is required.");
      return;
    }

    setEditSaving(true);
    setEditError(null);
    setStatus(null);

    const prev = tasks;
    setTasks((cur) =>
      cur.map((t) =>
        t.id === editTaskId
          ? {
              ...t,
              title: trimmed,
              type: editType,
              date: editDueDate || t.date,
              detail: editDescription,
            }
          : t,
      ),
    );

    try {
      const supabase = createBrowserSupabaseClient();
      const updatePayload = {
        title: trimmed,
        type: editType,
        due_date: editDueDate || null,
        description: editDescription.trim() || null,
      };

      const { error } = await supabase.from("assignments").update(updatePayload).eq("id", editTaskId);
      if (error) throw error;

      setEditTaskId(null);
      window.dispatchEvent(new Event("study-buddy:tasks-changed"));
    } catch (e) {
      setTasks(prev);
      setEditError(toErrorMessage(e));
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Results</div>
            <div className="mt-1 text-sm text-slate-700">
              AI found {counts.quizzes} Quizzes, {counts.assignments} Assignments,
              and {counts.exams} Exams.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              <span className="text-slate-500">Reminder</span>
              <select
                value={reminderMinutes == null ? "none" : String(reminderMinutes)}
                onChange={(e) => {
                  const raw = e.target.value;
                  const next: ReminderMinutes = raw === "none" ? null : Number(raw);
                  setReminderMinutes(next);
                  saveReminderMinutes(next);
                }}
                className="h-7 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700"
                aria-label="Default reminder"
              >
                {REMINDER_OPTIONS.map((opt) => (
                  <option
                    key={opt.value == null ? "none" : String(opt.value)}
                    value={opt.value == null ? "none" : String(opt.value)}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

          <button
            type="button"
            onClick={onSyncAll}
            disabled={syncingCalendar}
            aria-busy={syncingCalendar}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncingCalendar ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            {syncingCalendar ? "Syncing…" : "Sync to Google"}
          </button>
          </div>
        </div>
        {status ? <div className="mt-3 text-xs text-slate-500">{status}</div> : null}
      </div>

      {/* Filters + Sort */}
      {tasks.length > 0 ? (
        <div className="-mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700"
          >
            <option value="all">All types</option>
            <option value="quiz">Quizzes</option>
            <option value="assignment">Assignments</option>
            <option value="exam">Exams</option>
          </select>
          <select
            value={filterDue}
            onChange={(e) => setFilterDue(e.target.value as typeof filterDue)}
            className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700"
          >
            <option value="all">All dates</option>
            <option value="week">Due this week</option>
            <option value="overdue">Overdue</option>
          </select>

          <div className="mx-1 h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>Sort:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700"
          >
            <option value="due">Soonest due</option>
            <option value="added">Recently added</option>
          </select>

          {(filterType !== "all" || filterDue !== "all") && (
            <button
              type="button"
              onClick={() => {
                setFilterType("all");
                setFilterDue("all");
              }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : null}

      {tasks.length ? (
        <div className="-mt-3 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (allSelected) {
                setSelected({});
                return;
              }
              const next: Record<string, boolean> = {};
              for (const t of tasks) next[t.id] = true;
              setSelected(next);
            }}
            className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-sm hover:bg-slate-50"
          >
            {allSelected ? "Clear selection" : "Select all"}
          </button>

          {selectedIds.length ? (
            <>
              <div className="px-2 text-xs text-slate-500">{selectedIds.length} selected</div>
              <button
                type="button"
                onClick={deleteSelectedTasks}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete selected
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading tasks from Supabase…
        </div>
      ) : null}

      {!loading && tasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No tasks yet. Parse a syllabus and click “Save to Tasks” to populate this view.
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {columns.map((col) => (
            <div key={col.id} className="md:col-span-4 min-w-0 overflow-hidden">
              <div className="mb-3 pl-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {col.label}
              </div>

              <DroppableColumn id={col.id} empty={grouped[col.id].length === 0}>
                <div className="space-y-4">
                  {grouped[col.id].map((task) => {
                    const isOpen = !!expanded[task.id];
                    const isSelected = !!selected[task.id];

                    return (
                      <DraggableTaskCard
                        key={task.id}
                        task={task}
                        isOpen={isOpen}
                        isSelected={isSelected}
                        onToggleOpen={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [task.id]: !prev[task.id],
                          }))
                        }
                        onToggleSelected={(next) =>
                          setSelected((prev) => {
                            const out = { ...prev };
                            if (next) out[task.id] = true;
                            else delete out[task.id];
                            return out;
                          })
                        }
                        onChangeStatus={(next) => updateStatus(task.id, next)}
                        onEdit={() => openEdit(task.id)}
                      />
                    );
                  })}
                </div>
              </DroppableColumn>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[340px] rounded-3xl border border-slate-200 bg-white px-5 py-4">
              <div className="text-sm font-semibold text-slate-900">{activeTask.title}</div>
              <div className="mt-1 text-xs text-slate-500">{activeTask.date} · {activeTask.detail}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingTask ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={closeEdit}
          />
          <div className="absolute inset-0 grid place-items-center px-4">
            <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Edit task</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Update title, type, due date, and notes.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Title
                  </label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Type
                    </label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as "quiz" | "assignment" | "exam")}
                      className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="assignment">Assignment</option>
                      <option value="quiz">Quiz</option>
                      <option value="exam">Exam</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Due
                    </label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Notes (optional)
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-1 min-h-[90px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {editError ? <div className="text-xs text-rose-600">{editError}</div> : null}

                <div className="mt-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeEdit}
                    disabled={editSaving}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={editSaving || !editTitle.trim()}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {editSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
