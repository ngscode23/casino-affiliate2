import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createSupabaseFetchLogger } from "./fetch-logger";

function getAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function createClient() {
  const cookieStore = await cookies();
  const serverFetch = createSupabaseFetchLogger("server", console.info, {
    retries: 2,
    baseDelayMs: 250,
    maxConcurrency: 8,
  });

  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getAnonKey()!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component; middleware can refresh sessions.
          }
        },
      },
      global: {
        fetch: serverFetch,
      },
    }
  );
}

type DatabaseClient<T = any> = SupabaseClient<T>;

/**
 * Создает Supabase клиент c bearer-токеном пользователя (для API-роутов/edge).
 * Использует те же настройки логирования/ретраев, что и SSR клиент.
 */
export function createAuthenticatedClient<T = any>(
  accessToken: string,
  label = "api-auth"
): DatabaseClient<T> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_*KEY");
  }

  const fetchLogger = createSupabaseFetchLogger(label, console.info, {
    retries: 2,
    baseDelayMs: 200,
    maxConcurrency: 8,
  });

  return createSupabaseClient<T>(supabaseUrl, supabaseKey, {
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
