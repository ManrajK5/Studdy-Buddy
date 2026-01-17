import { createClient } from "@supabase/supabase-js";

export function createBrowserSupabaseClient() {
  const url = "https://tcctmwjvfnmcduauifug.supabase.co";
  const anonKey = "sb_publishable_46IIEf9paJr-8KpDzyL5Pw_x--rep9L";

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createClient(url, anonKey);
}
