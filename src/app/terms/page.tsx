export default function TermsPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Terms of Service</h1>
        <p className="mt-1 text-sm text-slate-500">Last updated: February 7, 2026</p>
      </header>

      <div className="space-y-6 rounded-3xl border border-slate-100 bg-white p-6 text-sm text-slate-700 shadow-sm">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Use of the app</h2>
          <p>
            Study Buddy is provided as-is to help you organize school deadlines. You are responsible for verifying the extracted
            dates and details.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Acceptable use</h2>
          <p>
            Don’t misuse the service, attempt to break it, or upload content you don’t have the right to use.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Third-party services</h2>
          <p>
            Study Buddy integrates with services like Google Calendar and Supabase. Their terms and policies also apply.
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
