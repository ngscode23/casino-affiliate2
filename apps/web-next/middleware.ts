declare const EdgeRuntime: string | undefined;

const globalForPatch = globalThis as typeof globalThis & {
  __importUnsupportedPatched?: boolean;
};

// Next edge runtime runs globals.ts multiple times under Turbopack/HMR, causing
// Object.defineProperty(globalThis, "__import_unsupported", ...) to throw because the
// property is non-configurable after the first definition. Patch defineProperty once
// so repeated definitions are ignored instead of crashing the middleware bootstrap.
if (
  typeof EdgeRuntime === "string" &&
  !globalForPatch.__importUnsupportedPatched
) {
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function definePropertyPatched(
    target: any,
    property: PropertyKey,
    attributes: PropertyDescriptor
  ) {
    if (
      target === globalThis &&
      property === "__import_unsupported" &&
      Object.prototype.hasOwnProperty.call(globalThis, "__import_unsupported")
    ) {
      return target;
    }
    return originalDefineProperty(target, property, attributes);
  };
  globalForPatch.__importUnsupportedPatched = true;
}

import { NextResponse, type NextRequest } from "next/server";
import { middleware as supabaseMiddleware } from "./utils/supabase/middleware";
import { sanitizeSearchParam, isSanitized } from "@shared/lib/sanitize";

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
  if (name.startsWith("sb-") && /-(access|refresh|auth)-token$/.test(name)) {
    return true;
  }
  if (SUPABASE_COOKIE_PREFIX) {
    if (
      name.startsWith(`${SUPABASE_COOKIE_PREFIX}-`) &&
      /-(access|refresh|auth)-token$/.test(name)
    ) {
      return true;
    }
  }
  return false;
}

function hasAuthCookie(req: NextRequest, res?: NextResponse) {
  // ????????? ? ??????, ? (?? ?????? ??????) ????? ????? updateSession -
  // ????? helper ??? ??????? ????
  const reqCookies = req.cookies.getAll?.() ?? [];
  if (reqCookies.some((cookie) => isSupabaseCookie(cookie.name))) {
    return true;
  }
  if (res) {
    const resCookies = res.cookies.getAll?.() ?? [];
    if (resCookies.some((cookie) => isSupabaseCookie(cookie.name))) {
      return true;
    }
  }
  return false;
}

function requiresAuth(pathname: string) {
  // ???????? ???? ????????? ???? ??? ?????????????
  // ???????? ????????? ?????? ? /checkout ??? ???????????, ????? ?? ??????????? ??????
  return pathname.startsWith("/account");
}

export async function middleware(request: NextRequest) {
  const unsafeRedirect = sanitizeRequestUrl(request);
  if (unsafeRedirect) {
    return unsafeRedirect;
  }
  // 1) ????????? ?????? ????? ??? supabase-helper
  const response = supabaseMiddleware(request);

  const { pathname, search } = request.nextUrl;

  // 2) ?????????? ????-????? (?????, ????????? API ? ?.?.)
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/public") ||
    pathname === "/"
  ) {
    return response;
  }

  // 3) ???? ??? ?????????? ???? - ????? ???????????
  if (requiresAuth(pathname)) {
    const isAuthed = hasAuthCookie(request, response);
    if (!isAuthed) {
      const url = new URL("/login", request.url);
      // ?????????? ???????????? ????? ????? ??????
      const redirectTo = pathname + (search || "");
      url.searchParams.set("redirect", redirectTo);
      return NextResponse.redirect(url);
    }
  }

  // 4) ????? - ??? ??????
  return response;
}

/**
 * ?????? ??????? ??? ? ????: ?????????? ???????, ??????????? ???????? ? favicons.
 * ??? ??????? ????? ????????? ?????????? (????????, /health, /sitemap.xml ? ?.?.)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

function sanitizeRequestUrl(request: NextRequest): NextResponse | null {
  const url = request.nextUrl.clone();
  if (!url.search) return null;
  let mutated = false;
  for (const [key, value] of url.searchParams.entries()) {
    const sanitized = sanitizeSearchParam(value);
    if (!isSanitized(value, sanitized)) continue;
    mutated = true;
    if (sanitized) {
      url.searchParams.set(key, sanitized);
    } else {
      url.searchParams.delete(key);
    }
  }
  if (!mutated) return null;
  url.hash = "";
  return NextResponse.redirect(url, 302);
}


