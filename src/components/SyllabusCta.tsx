"use client";

import Link from "next/link";
import { Wand2, ArrowRight } from "lucide-react";

export function SyllabusCta() {
  return (
    <section className="flex h-full flex-col justify-between rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col items-center px-6 pt-5 pb-5 text-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900">
          <Wand2 className="h-4 w-4 text-white" />
        </div>
        <h2 className="mt-2 text-sm font-semibold text-slate-900">Add Tasks</h2>

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Drop or paste your syllabus and we&apos;ll extract every quiz,
          assignment, and exam — then sync them to Google Calendar with
          reminders.
        </p>

        <Link
          href="/syllabus"
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
        >
          Go to Syllabus Parser
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
