// Supabase client (single instance; reuses window cache during HMR)
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/config";

declare global {
  interface Window {
    __supabase?: ReturnType<typeof createClient>;
  }
}

const storageKey = "sb-casino-affiliate-auth";

const create = () =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey,
    },
  });

let supabaseInstance: any =
  typeof window !== "undefined" ? window.__supabase : undefined;

if (!supabaseInstance) {
  supabaseInstance = create();
  if (typeof window !== "undefined") {
    window.__supabase = supabaseInstance;
  }
}

export const supabase = supabaseInstance as any;
