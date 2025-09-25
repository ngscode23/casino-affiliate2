import { createBrowserClient } from "@supabase/ssr";

function getAnonKey() {
  // Prefer new publishable key format (sb_publishable_*), fallback to anon
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getAnonKey()!
  );
}
