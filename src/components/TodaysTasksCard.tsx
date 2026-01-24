"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { BentoCard } from "@/components/BentoCard";
import { TodaysTasks } from "@/components/TodaysTasks";

export function TodaysTasksCard() {
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <BentoCard
      title="Today's Tasks"
      subtitle="A lightweight checklist"
      className="h-full"
      right={
        <button
          type="button"
          onClick={() => setComposerOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          aria-label={composerOpen ? "Close add task" : "Add a task"}
        >
          {composerOpen ? (
            <>
              <X className="h-4 w-4" />
              Close
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add
            </>
          )}
        </button>
      }
    >
      <TodaysTasks composerOpen={composerOpen} onComposerOpenChange={setComposerOpen} />
    </BentoCard>
  );
}
