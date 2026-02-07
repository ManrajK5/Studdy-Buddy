"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ExternalLink } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type AssignmentRow = {
  id: string;
  title: string;
  type: "quiz" | "assignment" | "exam" | string;
  due_date: string | null;
  completed_at: string | null;
};

const typeColors: Record<string, string> = {
  quiz: "bg-blue-100 text-blue-700 border-blue-200",
  assignment: "bg-amber-100 text-amber-700 border-amber-200",
  exam: "bg-rose-100 text-rose-700 border-rose-200",
};

function formatDateLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function GoogleCalendarCard() {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const supabase = createBrowserSupabaseClient();
        const start = formatDateLocal(new Date());
        const end = formatDateLocal(addDays(new Date(), 6));

        const { data, error } = await supabase
          .from("assignments")
          .select("id,title,type,due_date,completed_at")
          .gte("due_date", start)
          .lte("due_date", end)
          .order("due_date", { ascending: true });

        if (error) throw error;
        if (mounted) setRows(data ?? []);
      } catch {
        // silently fail — empty calendar is fine
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

  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(new Date(), i);
      return {
        weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
        dayNum: date.getDate(),
        month: date.toLocaleDateString(undefined, { month: "short" }),
        key: formatDateLocal(date),
        isToday: i === 0,
      };
    });
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, AssignmentRow[]>();
    for (const row of rows) {
      const key = row.due_date ?? "";
      if (!key) continue;
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return map;
  }, [rows]);

  return (
    <section className="rounded-3xl border border-slate-100 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-4 px-6 pt-5 pb-1">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-900" />
          <h2 className="text-sm font-semibold text-slate-900">Your Week</h2>
        </div>
        <a
          href="https://calendar.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Google Calendar
        </a>
      </header>

      <div className="px-6 pb-5 pt-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
            Loading schedule…
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {days.map((d) => {
              const items = byDate.get(d.key) ?? [];
              return (
                <div
                  key={d.key}
                  className={
                    "flex flex-col rounded-2xl border px-3 py-3 transition-colors " +
                    (d.isToday
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-100 bg-slate-50 text-slate-900")
                  }
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span
                      className={
                        "text-xs font-semibold " +
                        (d.isToday ? "text-slate-300" : "text-slate-500")
                      }
                    >
                      {d.weekday}
                    </span>
                    <span className="text-lg font-bold leading-none">{d.dayNum}</span>
                  </div>

                  <div className="mt-2 space-y-1.5 min-h-[40px]">
                    {items.length === 0 ? (
                      <span
                        className={
                          "text-[11px] " +
                          (d.isToday ? "text-slate-400" : "text-slate-400")
                        }
                      >
                        No tasks
                      </span>
                    ) : (
                      items.slice(0, 3).map((item) => {
                        const done = Boolean(item.completed_at);
                        return (
                          <div
                            key={item.id}
                            className={
                              "truncate rounded-lg px-1.5 py-0.5 text-[11px] font-medium " +
                              (d.isToday
                                ? done
                                  ? "bg-slate-700 text-slate-400 line-through"
                                  : "bg-slate-800 text-white"
                                : done
                                  ? "bg-slate-100 text-slate-400 line-through"
                                  : (typeColors[item.type] ??
                                      "bg-slate-100 text-slate-700"))
                            }
                            title={item.title}
                          >
                            {item.title}
                          </div>
                        );
                      })
                    )}
                    {items.length > 3 ? (
                      <span
                        className={
                          "text-[10px] " +
                          (d.isToday ? "text-slate-400" : "text-slate-400")
                        }
                      >
                        +{items.length - 3} more
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
