import { BentoCard } from "@/components/BentoCard";
import { ProgressRing } from "@/components/ProgressRing";
import { SyllabusParser } from "@/components/SyllabusParser";
import { TodaysTasks } from "@/components/TodaysTasks";
import { WeeklySchedule } from "@/components/WeeklySchedule";
import { FocusTimer } from "@/components/FocusTimer";
import { StickyNoteWidget } from "@/components/StickyNoteWidget";
import { FocusModeToggle } from "@/components/FocusModeToggle";
import { DashboardKpis } from "@/components/DashboardKpis";
import { Wand2 } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Syllabus → structured plan → calendar sync.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <DashboardKpis />

        <div className="md:col-span-8">
          <BentoCard
            title="AI Syllabus Parser"
            subtitle="Drop your syllabus and generate a clean plan instantly"
            right={<Wand2 className="h-4 w-4 text-slate-900" />}
          >
            <SyllabusParser />
          </BentoCard>
        </div>

        <div className="md:col-span-4">
          <BentoCard title="Today's Tasks" subtitle="A lightweight checklist">
            <TodaysTasks />
          </BentoCard>
        </div>

        <div className="md:col-span-8">
          <BentoCard title="Weekly Schedule" subtitle="Calendar view">
            <WeeklySchedule />
          </BentoCard>
        </div>

        <div className="md:col-span-4">
          <BentoCard title="Focus Timer" subtitle="Single sprint">
            <FocusTimer />
          </BentoCard>
        </div>

        <div className="md:col-span-4">
          <StickyNoteWidget />
        </div>

        <div className="md:col-span-8">
          <BentoCard title="Focus Mode Bridge" subtitle="Chrome extension toggle">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <ProgressRing value={0.75} />
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <FocusModeToggle />
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
