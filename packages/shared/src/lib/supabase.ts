// Supabase client (single instance; reuses window cache during HMR)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@shared/config";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Supabase URL/key are not configured");
}

declare global {
  interface Window {
    __supabase?: SupabaseClient;
  }
}

const storageKey = "sb-casino-affiliate-auth";

function createSupabase(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey,
    },
  });
}

let supabaseInstance: SupabaseClient;

if (typeof window !== "undefined") {
  supabaseInstance = window.__supabase ?? createSupabase();
  window.__supabase = supabaseInstance;
} else {
  supabaseInstance = createSupabase();
}

export const supabase = supabaseInstance;


