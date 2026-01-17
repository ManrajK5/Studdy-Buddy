import { BentoCard } from "@/components/BentoCard";
import { SyllabusParser } from "@/components/SyllabusParser";

export default function SyllabusPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Syllabus Parser
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Paste a syllabus, confirm extracted events, then sync.
        </p>
      </header>

      <BentoCard
        title="Paste Syllabus"
        subtitle="We’ll extract quizzes, assignments, and exams"
      >
        <SyllabusParser />
      </BentoCard>
    </div>
  );
}
