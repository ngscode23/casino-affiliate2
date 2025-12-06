import { createBrowserClient } from "@supabase/ssr";
import { createSupabaseFetchLogger } from "./fetch-logger";

function getAnonKey() {
  // Prefer new publishable key format (sb_publishable_*), fallback to anon
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createClient() {
  const browserFetch = createSupabaseFetchLogger("browser", console.debug, {
    retries: 2,
    baseDelayMs: 200,
  });
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getAnonKey()!,
    {
      global: {
        fetch: browserFetch,
      },
    }
  );
}
