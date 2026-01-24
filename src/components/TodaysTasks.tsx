"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type AssignmentRow = {
  id: string;
  title: string;
  completed_at: string | null;
  due_date: string | null;
};

function formatDateLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function TodaysTasks({
  composerOpen,
  onComposerOpenChange,
}: {
  composerOpen?: boolean;
  onComposerOpenChange?: (open: boolean) => void;
} = {}) {
  const [items, setItems] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const [internalComposerOpen, setInternalComposerOpen] = useState(false);
  const isComposerOpen = composerOpen ?? internalComposerOpen;
  const setComposerOpen = onComposerOpenChange ?? setInternalComposerOpen;

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setStatus(null);
      try {
        const supabase = createBrowserSupabaseClient();
        const today = formatDateLocal(new Date());
        const { data, error } = await supabase
          .from("assignments")
          .select("id,title,completed_at,due_date")
          .eq("due_date", today)
          .order("completed_at", { ascending: true });

        if (error) throw error;
        if (mounted) setItems(data ?? []);
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

  async function addTask() {
    const trimmed = title.trim();
    if (!trimmed) return;

    setSaving(true);
    setStatus(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData.session?.user.id;
      if (!userId) {
        setStatus("Sign in to add tasks.");
        return;
      }

      const today = formatDateLocal(new Date());
      const { data, error } = await supabase
        .from("assignments")
        .insert({
          user_id: userId,
          title: trimmed,
          type: "assignment",
          due_date: today,
        })
        .select("id,title,completed_at,due_date")
        .single();

      if (error) throw error;
      if (data) setItems((prev) => [data as AssignmentRow, ...prev]);

      setTitle("");
      setComposerOpen(false);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to add task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {isComposerOpen ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a task due today…"
              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              onKeyDown={(e) => {
                if (e.key === "Enter") addTask();
              }}
            />
            <button
              type="button"
              onClick={addTask}
              disabled={saving || !title.trim()}
              className="inline-flex h-9 items-center rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add"}
            </button>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Creates an item due today.</div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-3 overflow-auto">
      {loading ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Loading today’s tasks…
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          No tasks due today.
        </div>
      ) : null}

      {items.map((t) => {
        const done = Boolean(t.completed_at);
        return (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <div className="text-sm text-slate-900">{t.title}</div>
            <div
              className={
                "flex items-center gap-1 text-xs " +
                (done ? "text-slate-900" : "text-slate-400")
              }
            >
              <CheckCircle2 className="h-4 w-4" />
              {done ? "Done" : "Todo"}
            </div>
          </div>
        );
      })}

      </div>

      {status ? <div className="text-xs text-slate-500">{status}</div> : null}
    </div>
  );
}
