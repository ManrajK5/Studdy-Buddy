"use client";

import { useMemo, useState, useEffect } from "react";
import { CalendarCheck, Flame } from "lucide-react";
import { ProgressRing } from "@/components/ProgressRing";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type AssignmentRow = {
  id: string;
  type: "quiz" | "assignment" | "exam" | string;
  due_date: string | null;
  completed_at: string | null;
};

function formatDateLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function computeStreak(dates: string[]) {
  const dateSet = new Set(dates);
  let streak = 0;
  let cursor = startOfDay(new Date());
  while (true) {
    const key = formatDateLocal(cursor);
    if (dateSet.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function KpiTile({
  label,
  value,
  icon,
  right,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white px-5 py-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          {icon}
          <span>{label}</span>
        </div>
        {right}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export function DashboardKpis() {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus(null);
      try {
        const supabase = createBrowserSupabaseClient();
        const { data, error } = await supabase
          .from("assignments")
          .select("id,type,due_date,completed_at")
          .order("due_date", { ascending: true });

        if (error) throw error;
        if (mounted) setRows(data ?? []);
      } catch (e) {
        if (mounted)
          setStatus(e instanceof Error ? e.message : "Unable to load KPIs.");
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const today = formatDateLocal(new Date());

  const dueToday = useMemo(() => {
    return rows.filter((r) => r.due_date === today && !r.completed_at).length;
  }, [rows, today]);

  const streak = useMemo(() => {
    const completedDates = rows
      .filter((r) => r.completed_at)
      .map((r) => formatDateLocal(new Date(r.completed_at as string)));
    return computeStreak(completedDates);
  }, [rows]);

  const weeklyProgress = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 6);

    const startKey = formatDateLocal(start);
    const endKey = formatDateLocal(now);

    const inRange = (dateStr: string) => dateStr >= startKey && dateStr <= endKey;

    const total = rows.filter((r) => r.due_date && inRange(r.due_date)).length;
    const done = rows.filter(
      (r) => r.completed_at && inRange(formatDateLocal(new Date(r.completed_at))),
    ).length;

    const ratio = total === 0 ? 0 : Math.min(1, done / total);
    return { ratio, label: `${Math.round(ratio * 100)}%` };
  }, [rows]);

  return (
    <>
      <div className="md:col-span-4">
        <KpiTile
          label="Tasks Due Today"
          value={String(dueToday)}
          icon={<CalendarCheck className="h-4 w-4" />}
        />
      </div>
      <div className="md:col-span-4">
        <KpiTile
          label="Current Streak"
          value={`${streak} days`}
          icon={<Flame className="h-4 w-4" />}
        />
      </div>
      <div className="md:col-span-4">
        <KpiTile
          label="Weekly Progress"
          value={weeklyProgress.label}
          icon={<ProgressRing value={weeklyProgress.ratio} />}
          right={<span className="text-xs text-slate-400">on track</span>}
        />
      </div>
      {status ? (
        <div className="md:col-span-12 text-xs text-slate-500">{status}</div>
      ) : null}
    </>
  );
}
