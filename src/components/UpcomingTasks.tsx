"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type AssignmentRow = {
  id: string;
  title: string;
  type: "quiz" | "assignment" | "exam" | string;
  due_date: string | null;
  completed_at: string | null;
};

const badgeStyles: Record<string, string> = {
  quiz: "bg-blue-100 text-blue-700",
  assignment: "bg-amber-100 text-amber-700",
  exam: "bg-rose-100 text-rose-700",
};

const badgeLetters: Record<string, string> = {
  quiz: "Q",
  assignment: "A",
  exam: "E",
};

function formatRelativeDate(dateStr: string): { text: string; className: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return {
      text: `Overdue by ${abs}d`,
      className: "text-rose-600 font-medium",
    };
  }
  if (diffDays === 0) return { text: "Due today", className: "text-amber-600 font-medium" };
  if (diffDays === 1) return { text: "Due tomorrow", className: "text-amber-600 font-medium" };
  if (diffDays <= 7) return { text: `Due in ${diffDays}d`, className: "text-slate-600 font-medium" };
  return { text: dateStr, className: "text-slate-500" };
}

export function UpcomingTasks() {
  const [tasks, setTasks] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const supabase = createBrowserSupabaseClient();
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");
        const todayKey = `${y}-${m}-${d}`;

        const { data, error } = await supabase
          .from("assignments")
          .select("id,title,type,due_date,completed_at")
          .gte("due_date", todayKey)
          .is("completed_at", null)
          .order("due_date", { ascending: true })
          .limit(6);

        if (error) throw error;
        if (mounted) setTasks(data ?? []);
      } catch {
        // silently fail
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    const onChanged = () => load();
    window.addEventListener("study-buddy:tasks-changed", onChanged);
    return () => {
      mounted = false;
      window.removeEventListener("study-buddy:tasks-changed", onChanged);
    };
  }, []);

  return (
    <section className="flex h-full flex-col rounded-3xl border border-slate-100 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-4 px-6 pt-5 pb-1">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-900" />
          <h2 className="text-sm font-semibold text-slate-900">Upcoming</h2>
        </div>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="flex-1 px-6 pb-5 pt-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
            Loading…
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
            No upcoming tasks.{" "}
            <Link href="/syllabus" className="underline hover:text-slate-700">
              Parse a syllabus
            </Link>{" "}
            to add some.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => {
              const rel = t.due_date
                ? formatRelativeDate(t.due_date)
                : { text: "No date", className: "text-slate-400" };
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${badgeStyles[t.type] ?? "bg-slate-100 text-slate-600"}`}
                    title={t.type}
                  >
                    {badgeLetters[t.type] ?? "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {t.title}
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs ${rel.className}`}>
                    {rel.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
