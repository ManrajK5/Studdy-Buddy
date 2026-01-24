"use client";

import { cn } from "@/lib/utils";

export function StickyNote({
  label = "Sticky Note",
  value,
  onChange,
  placeholder = "Quick notes…",
  className,
}: {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-yellow-100 bg-yellow-50 shadow-sm",
        className,
      )}
    >
      <div className="px-6 pt-6">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="mt-1 text-xs text-slate-500">
          A quick scratchpad for your day.
        </div>
      </div>
      <div className="px-6 pb-6 pt-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[160px] w-full resize-none rounded-2xl border border-yellow-100 bg-yellow-100/40 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-yellow-200"
        />
      </div>
    </div>
  );
}
