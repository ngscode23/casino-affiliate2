import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@shared/lib/database.types";
import { createSupabaseFetchLogger } from "./fetch-logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createAuthenticatedClient(
  accessToken: string,
  label = "api-auth",
): SupabaseClient<Database> {
  const fetchLogger = createSupabaseFetchLogger(label);
  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: fetchLogger,
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    },
  });
}

