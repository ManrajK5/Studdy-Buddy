"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type TaskStatus = "upcoming" | "in-progress" | "completed";
type TaskType = "assignment" | "quiz" | "exam";

function isMissingStatusColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const maybe = err as { code?: unknown; message?: unknown };
  const code = typeof maybe.code === "string" ? maybe.code : "";
  const message = typeof maybe.message === "string" ? maybe.message : "";

  if (code === "42703") return true;
  const m = message.toLowerCase();
  return m.includes("column") && m.includes("status") && m.includes("does not exist");
}

export function TasksAddTaskButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("assignment");
  const [status, setStatus] = useState<TaskStatus>("upcoming");
  const [dueDate, setDueDate] = useState<string>("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    const trimmed = title.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData.session?.user.id;
      if (!userId) {
        setError("Sign in to add tasks.");
        return;
      }

      const completedAt = status === "completed" ? new Date().toISOString() : null;

      {
        const { error: insertError } = await supabase.from("assignments").insert({
          user_id: userId,
          title: trimmed,
          type,
          status,
          due_date: dueDate || null,
          description: description.trim() || null,
          completed_at: completedAt,
        });

        if (insertError && isMissingStatusColumnError(insertError)) {
          const { error: fallbackError } = await supabase.from("assignments").insert({
            user_id: userId,
            title: trimmed,
            type,
            due_date: dueDate || null,
            description: description.trim() || null,
            completed_at: completedAt,
          });
          if (fallbackError) throw fallbackError;
          setError("Added task, but status needs DB migration 003 to persist.");
        } else if (insertError) {
          throw insertError;
        }
      }

      window.dispatchEvent(new Event("study-buddy:tasks-changed"));
      setOpen(false);
      setTitle("");
      setDueDate("");
      setDescription("");
      setStatus("upcoming");
      setType("assignment");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        Add task
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => !saving && setOpen(false)}
          />
          <div className="absolute inset-0 grid place-items-center px-4">
            <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Add a task</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Set status and due date manually.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !saving && setOpen(false)}
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
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Submit Assignment 2"
                    className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Type
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as TaskType)}
                      className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="assignment">Assignment</option>
                      <option value="quiz">Quiz</option>
                      <option value="exam">Exam</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="in-progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Due
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Notes (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Any details…"
                    className="mt-1 min-h-[80px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {error ? <div className="text-xs text-rose-600">{error}</div> : null}

                <div className="mt-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={saving}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onCreate}
                    disabled={saving || !title.trim()}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {saving ? "Adding…" : "Add task"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
