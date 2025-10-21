import { createServerClient } from "@supabase/ssr";
import { AuthApiError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[middleware] Supabase credentials missing; skipping session refresh.",
      );
    }
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    // refreshing the auth token
    const { error } = await supabase.auth.getUser();
    if (
      error instanceof AuthApiError &&
      error.code === "refresh_token_not_found"
    ) {
      clearSupabaseCookies(request, supabaseResponse);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[middleware] Supabase session refresh failed:", error);
    }
  }

  return supabaseResponse;
}

const RAW_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const SUPABASE_COOKIE_PREFIX = (() => {
  const match = RAW_SUPABASE_URL.match(/^https?:\/\/([^.\s]+)\.supabase\.co/i);
  return match ? `sb-${match[1]}` : null;
})();

const STATIC_COOKIE_NAMES = new Set([
  "sb-access-token",
  "sb-refresh-token",
  "sb:token",
  "supabase-auth-token",
  "supabase-session",
]);

function isSupabaseCookie(name: string): boolean {
  if (!name) return false;
  if (STATIC_COOKIE_NAMES.has(name)) return true;
  if (name.startsWith("sb-") && /-(access|refresh|auth)-token$/i.test(name)) {
    return true;
  }
  if (SUPABASE_COOKIE_PREFIX) {
    if (
      name.startsWith(`${SUPABASE_COOKIE_PREFIX}-`) &&
      /-(access|refresh|auth)-token$/i.test(name)
    ) {
      return true;
    }
  }
  return false;
}

function clearSupabaseCookies(
  request: NextRequest,
  response: NextResponse,
) {
  for (const cookie of request.cookies.getAll()) {
    if (isSupabaseCookie(cookie.name)) {
      response.cookies.delete(cookie.name);
    }
  }
  for (const cookie of response.cookies.getAll()) {
    if (isSupabaseCookie(cookie.name)) {
      response.cookies.delete(cookie.name);
    }
  }
}
