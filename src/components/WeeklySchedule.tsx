"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type AssignmentRow = {
  id: string;
  due_date: string | null;
  title: string;
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

export function WeeklySchedule() {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setStatus(null);
      try {
        const supabase = createBrowserSupabaseClient();
        const start = formatDateLocal(new Date());
        const end = formatDateLocal(addDays(new Date(), 6));

        const { data, error } = await supabase
          .from("assignments")
          .select("id,due_date,title")
          .gte("due_date", start)
          .lte("due_date", end)
          .order("due_date", { ascending: true });

        if (error) throw error;
        if (mounted) setRows(data ?? []);
      } catch (e) {
        if (mounted)
          setStatus(e instanceof Error ? e.message : "Failed to load schedule.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(new Date(), i);
      return {
        label: date.toLocaleDateString(undefined, { weekday: "short" }),
        date,
        key: formatDateLocal(date),
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
    <div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <CalendarDays className="h-4 w-4" />
        <span>Calendar view (next 7 days)</span>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Loading schedule…
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((d) => {
          const items = byDate.get(d.key) ?? [];
          return (
            <div
              key={d.key}
              className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
            >
              <div className="text-xs font-semibold text-slate-900">{d.label}</div>
              <div className="mt-2 text-[11px] text-slate-500">
                {items.length ? `${items.length} due` : "No events"}
              </div>
            </div>
          );
        })}
      </div>

      {status ? <div className="mt-3 text-xs text-slate-500">{status}</div> : null}
    </div>
  );
}
