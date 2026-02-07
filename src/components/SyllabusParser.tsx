"use client";

import { useMemo, useState, useTransition, useCallback, useEffect } from "react";
import { parseSyllabusAction, type ParsedSyllabus } from "@/app/actions/parseSyllabus";
import { batchCreateGoogleCalendarEvents } from "@/lib/googleCalendar";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import {
  loadReminderMinutes,
  REMINDER_OPTIONS,
  saveReminderMinutes,
  type ReminderMinutes,
} from "@/lib/reminderPrefs";
import {
  CalendarPlus,
  Wand2,
  Database,
  Loader2,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Upload,
} from "lucide-react";

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "number" || typeof err === "boolean" || err == null) {
    return String(err);
  }

  if (typeof err === "object") {
    const maybe = err as {
      message?: unknown;
      error?: unknown;
      error_description?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    const directMessage =
      typeof maybe.message === "string"
        ? maybe.message
        : typeof maybe.error_description === "string"
          ? maybe.error_description
          : typeof maybe.error === "string"
            ? maybe.error
            : null;

    if (directMessage) return directMessage;

    try {
      return JSON.stringify(err);
    } catch {
      return "Unknown error";
    }
  }

  return "Unknown error";
}

function toFriendlySaveError(err: unknown) {
  const raw = toErrorMessage(err);
  const msg = raw.toLowerCase();

  if (msg.includes("auth session missing") || msg.includes("jwt") || msg.includes("session")) {
    return "Please sign in to save tasks.";
  }

  if (msg.includes("missing next_public_supabase")) {
    return "Supabase isn't configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }

  return raw || "Save failed.";
}

type EditableEvent = {
  id: string;
  title: string;
  type: "quiz" | "assignment" | "exam";
  date: string;
  description: string;
};

const typeBadgeStyles: Record<EditableEvent["type"], string> = {
  quiz: "bg-blue-50 text-blue-700 border-blue-200",
  assignment: "bg-amber-50 text-amber-700 border-amber-200",
  exam: "bg-rose-50 text-rose-700 border-rose-200",
};

export function SyllabusParser() {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ParsedSyllabus | null>(null);
  const [editableEvents, setEditableEvents] = useState<EditableEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const [reminderMinutes, setReminderMinutes] = useState<ReminderMinutes>(1440);

  useEffect(() => {
    setReminderMinutes(loadReminderMinutes());
  }, []);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setFileLoading(true);
    setError(null);

    try {
      const name = file.name.toLowerCase();

      if (name.endsWith(".txt") || name.endsWith(".md")) {
        // Plain text files
        const content = await file.text();
        setText(content);
      } else if (name.endsWith(".pdf")) {
        // PDF files - load pdf.js from CDN to avoid Next.js bundling issues
        const PDFJS_VERSION = "3.11.174";
        const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

        // Load pdf.js library from CDN if not already loaded
        if (!(window as unknown as { pdfjsLib?: unknown }).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = `${PDFJS_CDN}/pdf.min.js`;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load PDF.js"));
            document.head.appendChild(script);
          });
        }

        const pdfjsLib = (window as unknown as { pdfjsLib: typeof import("pdfjs-dist") }).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: Record<string, unknown>) => (item.str as string) ?? "")
            .join(" ");
          fullText += pageText + "\n\n";
        }

        setText(fullText.trim());
      } else {
        setError("Unsupported file type. Use .txt, .md, or .pdf files.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read file.");
    } finally {
      setFileLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const summaryLine = useMemo(() => {
    if (!editableEvents.length) return null;
    const quizzes = editableEvents.filter((e) => e.type === "quiz").length;
    const assignments = editableEvents.filter((e) => e.type === "assignment").length;
    const exams = editableEvents.filter((e) => e.type === "exam").length;
    return `${quizzes} quizzes, ${assignments} assignments, ${exams} exams`;
  }, [editableEvents]);

  function onParse() {
    setError(null);
    setSyncStatus(null);
    setSaveStatus(null);
    setLastSyncedAt(null);
    setShowRawJson(false);

    const fd = new FormData();
    fd.set("syllabus", text);

    startTransition(async () => {
      const out = await parseSyllabusAction(fd);
      if (!out.ok) {
        setResult(null);
        setEditableEvents([]);
        setError(out.error);
        return;
      }
      setResult(out.data);
      // Convert to editable events with IDs
      setEditableEvents(
        out.data.events.map((e, i) => {
          const rawType = e.type as string;
          const safeType: "quiz" | "assignment" | "exam" =
            rawType === "quiz" || rawType === "assignment" || rawType === "exam"
              ? rawType
              : "assignment";
          return {
            id: `temp-${i}-${Date.now()}`,
            title: e.title,
            type: safeType,
            date: e.date.includes("T") ? e.date.split("T")[0] : e.date,
            description: e.description,
          };
        }),
      );
    });
  }

  function updateEvent(id: string, field: keyof EditableEvent, value: string) {
    setEditableEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  }

  function removeEvent(id: string) {
    setEditableEvents((prev) => prev.filter((e) => e.id !== id));
  }

  async function onSync() {
    if (syncing) return;
    setSyncing(true);
    setSyncStatus(null);

    if (!editableEvents.length) {
      setSyncStatus("No events to sync.");
      setSyncing(false);
      return;
    }

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
      setSyncStatus("Sign in with Google (Calendar scope) to enable sync.");
      setSyncing(false);
      return;
    }

    try {
      await batchCreateGoogleCalendarEvents({
        accessToken,
        events: editableEvents,
        reminderMinutes,
      });
      setSyncStatus(`Synced ${editableEvents.length} events to Google Calendar.`);
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setSyncStatus(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function onSaveToSupabase() {
    if (saving) return;
    setSaving(true);
    setSaveStatus(null);

    if (!editableEvents.length) {
      setSaveStatus("No events to save.");
      setSaving(false);
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        setSaveStatus("Sign in to save tasks.");
        setSaving(false);
        return;
      }

      // Check for duplicates (same title + date + type for this user)
      const { data: existingTasks } = await supabase
        .from("assignments")
        .select("title,due_date,type")
        .eq("user_id", userData.user.id);

      const existingSet = new Set(
        (existingTasks ?? []).map((t) => `${t.title}|${t.due_date}|${t.type}`),
      );

      const newEvents = editableEvents.filter(
        (e) => !existingSet.has(`${e.title}|${e.date}|${e.type}`),
      );

      if (newEvents.length === 0) {
        setSaveStatus("All tasks already saved.");
        setSaving(false);
        return;
      }

      const payload = newEvents.map((e) => ({
        title: e.title,
        type: e.type,
        due_date: e.date,
        description: e.description,
        source: "syllabus",
        user_id: userData.user.id,
      }));

      const { error: insertError } = await supabase
        .from("assignments")
        .insert(payload);

      if (insertError) throw insertError;

      const skipped = editableEvents.length - newEvents.length;
      const skippedMsg = skipped > 0 ? ` (${skipped} duplicates skipped)` : "";
      setSaveStatus(`Saved ${payload.length} tasks.${skippedMsg}`);
      
      // Notify other components
      window.dispatchEvent(new Event("study-buddy:tasks-changed"));
    } catch (e) {
      setSaveStatus(toFriendlySaveError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <Wand2 className="h-4 w-4 text-slate-900" />
          <label htmlFor="syllabus">Paste or Drop Syllabus</label>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <Upload className="h-3.5 w-3.5" />
          Browse
          <input
            type="file"
            accept=".txt,.md,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div
        className="relative mt-2"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <textarea
          id="syllabus"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the full syllabus text here, or drag and drop a .txt / .pdf file…"
          className={
            "min-h-[260px] w-full resize-none rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:ring-2 focus:ring-slate-200 " +
            (isDragging ? "border-slate-400 bg-slate-100" : "border-slate-100")
          }
          disabled={fileLoading}
        />

        {/* Drag overlay */}
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-400 bg-slate-100/80">
            <div className="flex flex-col items-center gap-2 text-slate-600">
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">Drop your syllabus file here</span>
              <span className="text-xs text-slate-500">.txt, .md, or .pdf</span>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {fileLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Reading file…</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onParse}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {pending ? "Parsing…" : "Parse"}
        </button>

        {error ? <div className="text-xs text-rose-600">{error}</div> : null}
      </div>

      {editableEvents.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Extracted Events
              </div>
              <div className="mt-0.5 text-xs text-slate-500">{summaryLine}</div>
            </div>
            {lastSyncedAt ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <Check className="h-3.5 w-3.5" />
                Synced at {lastSyncedAt}
              </div>
            ) : null}
          </div>

          {/* Editable events list */}
          <div className="mt-4 space-y-2 max-h-[300px] overflow-auto">
            {editableEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <input
                  type="text"
                  value={ev.title}
                  onChange={(e) => updateEvent(ev.id, "title", e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Title"
                />
                <select
                  value={ev.type}
                  onChange={(e) => updateEvent(ev.id, "type", e.target.value)}
                  className={`h-7 rounded-lg border px-2 text-[11px] font-semibold uppercase ${typeBadgeStyles[ev.type]}`}
                >
                  <option value="quiz">Quiz</option>
                  <option value="assignment">Assignment</option>
                  <option value="exam">Exam</option>
                </select>
                <input
                  type="date"
                  value={ev.date}
                  onChange={(e) => updateEvent(ev.id, "date", e.target.value)}
                  className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => removeEvent(ev.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                  aria-label={`Remove ${ev.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              <span className="text-slate-500">Reminder</span>
              <select
                value={reminderMinutes == null ? "none" : String(reminderMinutes)}
                onChange={(e) => {
                  const raw = e.target.value;
                  const next: ReminderMinutes = raw === "none" ? null : Number(raw);
                  setReminderMinutes(next);
                  saveReminderMinutes(next);
                }}
                className="h-7 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700"
                aria-label="Default reminder"
              >
                {REMINDER_OPTIONS.map((opt) => (
                  <option
                    key={opt.value == null ? "none" : String(opt.value)}
                    value={opt.value == null ? "none" : String(opt.value)}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarPlus className="h-4 w-4" />
              )}
              {syncing ? "Syncing…" : "Sync to Google"}
            </button>

            <button
              type="button"
              onClick={onSaveToSupabase}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save to Tasks"}
            </button>
          </div>

          {/* Status messages */}
          {syncStatus ? (
            <div className="mt-3 text-xs text-slate-600">{syncStatus}</div>
          ) : null}
          {saveStatus ? (
            <div className="mt-2 text-xs text-slate-600">{saveStatus}</div>
          ) : null}

          {/* Collapsible raw JSON */}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowRawJson((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              {showRawJson ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {showRawJson ? "Hide" : "Show"} raw JSON
            </button>
            {showRawJson && result ? (
              <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
                <pre className="text-[11px] leading-5 text-slate-600">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
