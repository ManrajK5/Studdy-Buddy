"use client";

import { useMemo, useState, useEffect } from "react";
import { batchCreateGoogleCalendarEvents } from "@/lib/googleCalendar";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { CalendarPlus, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

type TaskType = "quiz" | "assignment" | "exam" | "lecture";

type TaskItem = {
  id: string;
  title: string;
  type: TaskType;
  status: "upcoming" | "in-progress" | "completed";
  date: string;
  detail: string;
  subtasks?: Array<{ title: string; eta: string }>;
};

type AssignmentRow = {
  id: string;
  title: string;
  type: "quiz" | "assignment" | "exam" | string;
  due_date: string | null;
  description: string | null;
  completed_at: string | null;
  subtasks: Array<{ title: string; eta: string }> | null;
};

const badgeStyles: Record<TaskType, string> = {
  quiz: "bg-blue-50 text-blue-700 border-blue-100",
  assignment: "bg-amber-50 text-amber-700 border-amber-100",
  exam: "bg-rose-50 text-rose-700 border-rose-100",
  lecture: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

export function TasksBoard() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setStatus(null);
      try {
        const supabase = createBrowserSupabaseClient();
        const { data, error } = await supabase
          .from("assignments")
          .select("id,title,type,due_date,description,completed_at,subtasks")
          .order("due_date", { ascending: true });

        if (error) throw error;

        const now = new Date();
        const todayKey = now.toISOString().slice(0, 10);

        const mapped: TaskItem[] = (data ?? []).map((row: AssignmentRow) => {
          const hasCompleted = Boolean(row.completed_at);
          const date = row.due_date ?? todayKey;
          let status: TaskItem["status"] = "upcoming";
          if (hasCompleted) status = "completed";
          else if (date < todayKey) status = "in-progress";

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

        if (mounted) setTasks(mapped);
      } catch (e) {
        if (mounted)
          setStatus(e instanceof Error ? e.message : "Failed to load tasks.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const counts = useMemo(() => {
    return {
      quizzes: tasks.filter((t) => t.type === "quiz").length,
      assignments: tasks.filter((t) => t.type === "assignment").length,
      exams: tasks.filter((t) => t.type === "exam").length,
    };
  }, [tasks]);

  const grouped = useMemo(() => {
    return {
      upcoming: tasks.filter((t) => t.status === "upcoming"),
      inProgress: tasks.filter((t) => t.status === "in-progress"),
      completed: tasks.filter((t) => t.status === "completed"),
    };
  }, [tasks]);

  async function onSyncAll() {
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

      await batchCreateGoogleCalendarEvents({ accessToken, events });
      setStatus(`Synced ${events.length} events to Google Calendar.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Sync failed.");
    }
  }

  async function toggleComplete(taskId: string, nextComplete: boolean) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("assignments")
        .update({ completed_at: nextComplete ? new Date().toISOString() : null })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: nextComplete ? "completed" : "upcoming",
              }
            : t,
        ),
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Update failed.");
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
          <button
            type="button"
            onClick={onSyncAll}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
          >
            <CalendarPlus className="h-4 w-4" />
            Sync All to Google Calendar
          </button>
        </div>
        {status ? <div className="mt-3 text-xs text-slate-500">{status}</div> : null}
      </div>

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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {([
          { key: "upcoming", label: "Upcoming" },
          { key: "inProgress", label: "In Progress" },
          { key: "completed", label: "Completed" },
        ] as const).map((group) => (
          <div key={group.key} className="md:col-span-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
            </div>
            <div className="space-y-4">
              {grouped[group.key].map((task) => {
                const isOpen = !!expanded[task.id];
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [task.id]: !prev[task.id],
                      }))
                    }
                    className="w-full rounded-3xl border border-slate-100 bg-white px-5 py-4 text-left shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {task.title}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {task.date} · {task.detail}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${badgeStyles[task.type]}`}
                        >
                          {task.type}
                        </span>
                        {task.subtasks ? (
                          isOpen ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )
                        ) : null}
                      </div>
                    </div>

                    {isOpen && task.subtasks ? (
                      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="text-xs font-semibold text-slate-500">
                          AI Breakdown
                        </div>
                        <ul className="mt-2 space-y-2 text-xs text-slate-600">
                          {task.subtasks.map((sub) => (
                            <li key={sub.title} className="flex items-center justify-between">
                              <span>{sub.title}</span>
                              <span className="text-slate-400">{sub.eta}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : isOpen ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">
                        No AI breakdown yet.
                      </div>
                    ) : null}

                    {isOpen ? (
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                        <span>Update status</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleComplete(task.id, task.status !== "completed");
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-100 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {task.status === "completed" ? "Mark Incomplete" : "Mark Complete"}
                        </button>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
