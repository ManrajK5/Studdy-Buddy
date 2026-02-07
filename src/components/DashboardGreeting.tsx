"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

function formatDateLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardGreeting() {
  const [dueToday, setDueToday] = useState<number | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const supabase = createBrowserSupabaseClient();

        // Get user name
        const { data: userData } = await supabase.auth.getUser();
        if (mounted && userData.user) {
          const meta = userData.user.user_metadata as Record<string, unknown> | undefined;
          const fullName =
            (typeof meta?.full_name === "string" ? meta.full_name : null) ??
            (typeof meta?.name === "string" ? meta.name : null);
          if (fullName) setFirstName(fullName.split(" ")[0]);
        }

        // Count tasks due today
        const today = formatDateLocal(new Date());
        const { count, error } = await supabase
          .from("assignments")
          .select("id", { count: "exact", head: true })
          .eq("due_date", today)
          .is("completed_at", null);

        if (!error && mounted) setDueToday(count ?? 0);
      } catch {
        // silently fail
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

  const greeting = getGreeting();
  const name = firstName ? `, ${firstName}` : "";

  let subtitle: string;
  if (dueToday === null) subtitle = "Loading your schedule…";
  else if (dueToday === 0) subtitle = "No tasks due today, you're all clear.";
  else if (dueToday === 1) subtitle = "You have 1 task due today.";
  else subtitle = `You have ${dueToday} tasks due today.`;

  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        {greeting}{name}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </header>
  );
}
