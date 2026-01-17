"use client";

import { useMemo, useState } from "react";

type FocusMessage =
  | { type: "FOCUS_MODE"; enabled: boolean }
  | { type: string; [k: string]: unknown };

export function FocusModeToggle({
  label = "Focus Mode",
  description = "Sends a message to your site-blocker extension.",
  variant = "default",
}: {
  label?: string;
  description?: string;
  variant?: "default" | "deep-work";
}) {
  const extensionId =
    process.env.NEXT_PUBLIC_FOCUS_EXTENSION_ID || "[YOUR_ID]";

  const canSend = useMemo(() => {
    return (
      typeof window !== "undefined" &&
      typeof window.chrome?.runtime?.sendMessage === "function"
    );
  }, []);

  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);

    if (!canSend) {
      setStatus("Chrome extension bridge not available in this browser.");
      return;
    }

    setStatus(null);
    const payload: FocusMessage = { type: "FOCUS_MODE", enabled: next };

    try {
      const send = window.chrome?.runtime?.sendMessage;
      if (typeof send !== "function") {
        setStatus("Chrome runtime messaging not available.");
        return;
      }
      send(extensionId, payload);
    } catch {
      setStatus("Failed to message extension. Check the extension ID.");
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="mt-1 text-xs text-slate-500">{description}</div>
        {status ? <div className="mt-2 text-xs text-slate-500">{status}</div> : null}
      </div>

      <button
        type="button"
        onClick={toggle}
        className={
          "relative inline-flex h-9 w-16 items-center rounded-full border shadow-sm transition-colors " +
          (variant === "deep-work"
            ? enabled
              ? "border-slate-900 bg-slate-900"
              : "border-slate-300 bg-white"
            : enabled
              ? "border-slate-900 bg-slate-900"
              : "border-slate-100 bg-white")
        }
        aria-pressed={enabled}
      >
        <span
          className={
            "inline-block h-7 w-7 transform rounded-full shadow-sm transition-transform " +
            (variant === "deep-work"
              ? enabled
                ? "translate-x-8 bg-white"
                : "translate-x-1 bg-slate-900"
              : enabled
                ? "translate-x-8 bg-white"
                : "translate-x-1 bg-white")
          }
        />
      </button>
    </div>
  );
}
