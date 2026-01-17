"use client";

import { useEffect, useMemo, useState } from "react";

function formatSeconds(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusTimer() {
  const [defaultSeconds, setDefaultSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const storageKey = "study-buddy-focus-timer";

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        endAt?: number | null;
        duration?: number;
      };

      if (parsed.duration) {
        setDurationMinutes(Math.round(parsed.duration / 60));
        setDefaultSeconds(parsed.duration);
      }

      if (parsed.endAt && parsed.endAt > Date.now()) {
        const remaining = Math.max(0, Math.round((parsed.endAt - Date.now()) / 1000));
        setSecondsLeft(remaining);
        setRunning(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!running) return;

    const endAt = Date.now() + secondsLeft * 1000;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ endAt, duration: defaultSeconds }),
    );

    const t = window.setInterval(() => {
      const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }, 1000);

    return () => window.clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (secondsLeft === 0) {
      setRunning(false);
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ endAt: null, duration: defaultSeconds }),
      );
    }
  }, [secondsLeft]);

  const label = useMemo(() => formatSeconds(secondsLeft), [secondsLeft]);

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-semibold tabular-nums text-slate-900">
            {label}
          </div>
          <div className="mt-1 text-xs text-slate-500">25-minute focus sprint</div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRunning((v) => !v)}
            className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
          >
            {running ? "Pause" : "Start"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setSecondsLeft(defaultSeconds);
              window.localStorage.setItem(
                storageKey,
                JSON.stringify({ endAt: null, duration: defaultSeconds }),
              );
            }}
            className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-medium text-slate-500">Timer length (min)</label>
        <input
          type="number"
          min={5}
          max={120}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className="w-20 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="button"
          onClick={() => {
            const next = Math.max(5, Math.min(120, durationMinutes)) * 60;
            setDefaultSeconds(next);
            setSecondsLeft(next);
            setRunning(false);
            window.localStorage.setItem(
              storageKey,
              JSON.stringify({ endAt: null, duration: next }),
            );
          }}
          className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
        >
          Apply
        </button>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-900"
          style={{ width: `${(secondsLeft / defaultSeconds) * 100}%` }}
        />
      </div>
    </div>
  );
}
