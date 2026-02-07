export default function PrivacyPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Privacy Policy</h1>
        <p className="mt-1 text-sm text-slate-500">Last updated: February 7, 2026</p>
      </header>

      <div className="space-y-6 rounded-3xl border border-slate-100 bg-white p-6 text-sm text-slate-700 shadow-sm">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">What Study Buddy does</h2>
          <p>
            Study Buddy helps you turn syllabus text into tasks and optionally sync them to Google Calendar with reminders.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Data we store</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account info from Supabase Auth (e.g. your email).</li>
            <li>Tasks you save (title, type, due date, description).</li>
            <li>Optional: basic usage data required to run the app (session tokens managed by Supabase).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Google Calendar access</h2>
          <p>
            If you connect Google, Study Buddy requests permission to create calendar events on your behalf. We use that access to
            sync the tasks you choose to Google Calendar.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Syllabus text</h2>
          <p>
            When you paste or upload a syllabus for parsing, the text is processed to extract tasks. Avoid including sensitive
            personal information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
          <p>
            Questions? Email: <a className="underline" href="mailto:manrajkalra@gmail.com">manrajkalra@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
