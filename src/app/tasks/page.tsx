import { TasksBoard } from "@/components/TasksBoard";

export default function TasksPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Tasks
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Today’s checklist and your weekly view.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="md:col-span-12">
          <TasksBoard />
        </div>
      </div>
    </div>
  );
}
