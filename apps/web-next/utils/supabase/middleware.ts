import { NextResponse, type NextRequest } from "next/server";

// Edge-safe middleware: ?? ????? supabase-js/realtime, ?????? ???? ? ?????????
export const config = { matcher: ["/dashboard/:path*", "/account/:path*"] };

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

function isSupabaseCookieName(name: string): boolean {
  if (!name) return false;
  if (STATIC_COOKIE_NAMES.has(name)) return true;
  if (name.startsWith("sb-") && /-(access|refresh|auth)-token$/i.test(name)) return true;
  if (
    SUPABASE_COOKIE_PREFIX &&
    name.startsWith(`${SUPABASE_COOKIE_PREFIX}-`) &&
    /-(access|refresh|auth)-token$/i.test(name)
  ) {
    return true;
  }
  return false;
}

export function middleware(req: NextRequest) {
  const hasToken = req.cookies.getAll().some((cookie) => {
    if (!isSupabaseCookieName(cookie.name)) return false;
    return Boolean(cookie.value?.length);
  });

  if (!hasToken) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirectedFrom", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

