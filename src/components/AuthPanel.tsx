"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type UserView = {
  email?: string;
};

export function AuthPanel() {
  const hasEnv = useMemo(() => {
    return Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }, []);

  const [user, setUser] = useState<UserView | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!hasEnv) return;

    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { email: data.user.email ?? undefined } : null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(
        session?.user ? { email: session.user.email ?? undefined } : null,
      );
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [hasEnv]);

  async function signIn() {
    if (!hasEnv) {
      setStatus("Missing Supabase env vars in .env.local");
      return;
    }

    setStatus(null);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        scopes: "https://www.googleapis.com/auth/calendar.events",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (error) setStatus(error.message);
  }

  async function signOut() {
    if (!hasEnv) return;
    setStatus(null);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) setStatus(error.message);
  }

  return (
    <div className="flex items-center gap-3">
      {user?.email ? (
        <div className="hidden text-xs text-slate-500 sm:block">
          Signed in as <span className="text-slate-900">{user.email}</span>
        </div>
      ) : (
        <div className="hidden text-xs text-slate-500 sm:block">Not signed in</div>
      )}

      {user?.email ? (
        <button
          type="button"
          onClick={signOut}
          className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
        >
          Sign out
        </button>
      ) : (
        <button
          type="button"
          onClick={signIn}
          className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
        >
          Sign in with Google
        </button>
      )}

      {status ? <div className="text-xs text-slate-500">{status}</div> : null}
    </div>
  );
}
