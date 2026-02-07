export default function Home() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 pt-6 sm:pt-10">
      <div className="space-y-3">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Study Buddy
        </h1>
        <p className="text-pretty text-base text-slate-600 sm:text-lg">
          Paste or drop your syllabus, turn it into tasks, and sync deadlines to Google Calendar with
          reminders.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          Open Dashboard
        </a>
        <a
          href="/syllabus"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
        >
          Go to Syllabus Parser
        </a>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">What it does</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>Extracts assignments and due dates from syllabus text/PDF.</li>
          <li>Lets you edit and manage tasks in one place.</li>
          <li>Optionally syncs tasks to your Google Calendar with reminders.</li>
        </ul>
      </div>
    </section>
  );
}
