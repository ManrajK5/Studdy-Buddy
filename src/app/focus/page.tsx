import { BentoCard } from "@/components/BentoCard";
import { FocusTimer } from "@/components/FocusTimer";
import { ProgressRing } from "@/components/ProgressRing";
import { UsageStats } from "@/components/UsageStats";
import { FocusBlocker } from "@/components/FocusBlocker";

export default function FocusPage() {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white/70 p-6 shadow-sm backdrop-blur-md">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Focus
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Timer + site blocker bridge.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="md:col-span-7">
          <BentoCard
            title="Focus Timer"
            subtitle="Pomodoro mode"
            className="bg-white/60 backdrop-blur-md"
          >
            <FocusTimer />
          </BentoCard>
        </div>
        <div className="md:col-span-5">
          <BentoCard
            title="Most Used Websites"
            subtitle="Focus stats"
            className="bg-white/60 backdrop-blur-md"
          >
            <UsageStats />
          </BentoCard>
        </div>
        <div className="md:col-span-5">
          <BentoCard
            title="Weekly Progress"
            subtitle="A quick pulse check"
            className="bg-white/60 backdrop-blur-md"
          >
            <ProgressRing
              value={0.75}
              label="Weekly Progress"
              caption="Small wins add up."
              centerLabel="done"
            />
          </BentoCard>
        </div>
        <div className="md:col-span-7">
          <BentoCard
            title="Focus Blocker"
            subtitle="Block distracting sites during a session"
            className="bg-white/60 backdrop-blur-md"
          >
            <FocusBlocker />
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
