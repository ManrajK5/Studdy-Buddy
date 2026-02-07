# Study Buddy

Study Buddy is a small app I built to solve a real problem for my friends and me: keeping up with a bunch of class deadlines without living in my syllabus PDF.

You paste (or drop) your syllabus, Study Buddy extracts quizzes/assignments/exams, lets you quickly review/edit them, then syncs everything to Google Calendar with reminders so you stay on track.

## What it does

- **Syllabus → tasks**: Paste text or upload `.txt`, `.md`, or `.pdf` and extract key dated items.
- **Review before saving**: Edit titles/types/dates before saving to Tasks.
- **Tasks board**: Organize work and keep track of what’s done.
- **Google Calendar sync**: One-click sync with configurable reminder timing.

## Tech

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Auth + Postgres)
- Google Calendar API (uses the Google OAuth token from Supabase auth)

## Local setup

### 1) Install deps

```bash
npm install
```

### 2) Configure environment variables

Create a `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
```

Notes:
- Supabase values come from your Supabase project settings.
- `OPENAI_API_KEY` is used by the syllabus parsing server action.

### 3) Supabase database

Run the SQL migrations in `supabase/migrations/` in your Supabase SQL editor.

At minimum you’ll want the `assignments` table from the init migrations. If you already have data, apply migrations carefully.

### 4) Google Calendar sync

In Supabase Auth, enable **Google** as a provider and ensure Calendar scope is granted (so the app can create events).

### 5) Start dev

```bash
npm run dev
```

Open http://localhost:3000

## Reminders

Reminders are handled through Google Calendar event reminders.
You can choose the default reminder timing in the UI (stored in localStorage).

## Deploying

This repo is set up for Vercel-style deployments (push to GitHub → Vercel deploy).

## Why I built it

I wanted something that’s faster than manually copying due dates and more reliable than “I’ll remember it later.”
If you’re the kind of person who collects 5 syllabuses at the start of term and promises you’ll plan them… this is for you.
