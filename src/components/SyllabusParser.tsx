"use client";

import { useMemo, useState, useTransition } from "react";
import { parseSyllabusAction, type ParsedSyllabus } from "@/app/actions/parseSyllabus";
import { batchCreateGoogleCalendarEvents } from "@/lib/googleCalendar";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { CalendarPlus, Wand2, Database } from "lucide-react";

function toFriendlySaveError(err: unknown) {
  const raw = err instanceof Error ? err.message : String(err);
  const msg = raw.toLowerCase();

  if (msg.includes("auth session missing") || msg.includes("jwt") || msg.includes("session")) {
    return "Please sign in to save tasks.";
  }

  if (msg.includes("missing next_public_supabase")) {
    return "Supabase isn’t configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }

  return raw || "Save failed.";
}

export function SyllabusParser() {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ParsedSyllabus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const summaryLine = useMemo(() => {
    if (!result) return null;
    const s = result.summary;
    return `You have ${s.quizzes} quizzes, ${s.assignments} assignments, ${s.exams} exams.`;
  }, [result]);

  const sampleSyllabus =
    "Course: Intro to Data Systems\n" +
    "Week 2: Quiz 1 (Jan 25) on Chapters 1-2\n" +
    "Week 4: Assignment 1 due Feb 5 - ER Diagram\n" +
    "Week 6: Midterm Exam on Feb 20\n" +
    "Week 8: Assignment 2 due Mar 3 - SQL Queries\n" +
    "Week 10: Quiz 2 (Mar 17) on Joins\n" +
    "Week 12: Project proposal due Apr 2\n" +
    "Final Exam: May 1";

  function onParse() {
    setError(null);
    setSyncStatus(null);
    setSaveStatus(null);

    const fd = new FormData();
    fd.set("syllabus", text);

    startTransition(async () => {
      const out = await parseSyllabusAction(fd);
      if (!out.ok) {
        setResult(null);
        setError(out.error);
        return;
      }
      setResult(out.data);
    });
  }

  async function onSync() {
    setSyncStatus(null);

    if (!result?.events?.length) {
      setSyncStatus("No events to sync.");
      return;
    }

    // If you sign in with Supabase Google OAuth with Calendar scope,
    // the session may include provider_token for Google APIs.
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
      setSyncStatus(
        "Missing Google access token. Use “Sign in with Google” (Calendar scope) to enable sync.",
      );
      return;
    }

    try {
      await batchCreateGoogleCalendarEvents({
        accessToken,
        events: result.events,
      });
      setSyncStatus(`Synced ${result.events.length} events to Google Calendar.`);
    } catch (e) {
      setSyncStatus(e instanceof Error ? e.message : "Sync failed.");
    }
  }

  async function onSaveToSupabase() {
    setSaveStatus(null);

    if (!result?.events?.length) {
      setSaveStatus("No events to save.");
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        setSaveStatus("Sign in to save tasks to Supabase.");
        return;
      }

      const payload = result.events.map((e) => ({
        title: e.title,
        type: e.type,
        due_date: e.date.includes("T") ? e.date.split("T")[0] : e.date,
        description: e.description,
        source: "syllabus",
        user_id: userData.user.id,
      }));

      const { error: insertError } = await supabase
        .from("assignments")
        .insert(payload);

      if (insertError) throw insertError;
      setSaveStatus(`Saved ${payload.length} tasks to Supabase.`);
    } catch (e) {
      setSaveStatus(toFriendlySaveError(e));
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
        <Wand2 className="h-4 w-4 text-slate-900" />
        <label htmlFor="syllabus">Paste Syllabus</label>
      </div>
      <textarea
        id="syllabus"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the full syllabus text here…"
        className="mt-2 min-h-[260px] w-full resize-none rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
      />

      {!text && !result ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-sm text-slate-600">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-slate-900">
                No syllabus pasted yet
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Try a sample syllabus to see the parser in action.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setText(sampleSyllabus)}
              className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-sm hover:bg-slate-50"
            >
              Try a Sample Syllabus
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onParse}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
        >
          <Wand2 className="h-4 w-4" />
          {pending ? "Parsing…" : "Parse"}
        </button>

        {error ? <div className="text-xs text-slate-500">{error}</div> : null}
      </div>

      {result ? (
        <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">
            Confirmation
          </div>
          <div className="mt-1 text-sm text-slate-700">{summaryLine}</div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onSync}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
            >
              <CalendarPlus className="h-4 w-4" />
              Sync to Google Calendar
            </button>

            <button
              type="button"
              onClick={onSaveToSupabase}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
            >
              <Database className="h-4 w-4" />
              Save to Tasks
            </button>

            {syncStatus ? (
              <div className="text-xs text-slate-500">{syncStatus}</div>
            ) : null}
          </div>

          {saveStatus ? (
            <div className="mt-3 text-xs text-slate-500">{saveStatus}</div>
          ) : null}

          <div className="mt-4 max-h-40 overflow-auto rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <pre className="text-[11px] leading-5 text-slate-700">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
