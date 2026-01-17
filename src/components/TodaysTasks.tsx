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

export function TodaysTasks() {
  const [items, setItems] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

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

  return (
    <div className="space-y-3">
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

      {status ? <div className="text-xs text-slate-500">{status}</div> : null}
    </div>
  );
}
