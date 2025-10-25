// Fix for EdgeRuntime double-define under Turbopack/HMR
declare const EdgeRuntime: string | undefined;

const globalForPatch = globalThis as typeof globalThis & {
  __importUnsupportedPatched?: boolean;
};

if (typeof EdgeRuntime === 'string' && !globalForPatch.__importUnsupportedPatched) {
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function definePropertyPatched(
    target: object,
    property: PropertyKey,
    attributes: PropertyDescriptor
  ) {
    if (
      target === globalThis &&
      property === '__import_unsupported' &&
      Object.prototype.hasOwnProperty.call(globalThis, '__import_unsupported')
    ) {
      return target;
    }
    return originalDefineProperty(target, property, attributes);
  };
  globalForPatch.__importUnsupportedPatched = true;
}

import { NextResponse, type NextRequest } from 'next/server';
import { middleware as supabaseMiddleware } from './utils/supabase/middleware';
import { sanitizeSearchParam, isSanitized } from '@shared/lib/sanitize';

/** ---------- Supabase auth cookie detection ---------- */

const RAW_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';

const SUPABASE_COOKIE_PREFIX = (() => {
  const match = RAW_SUPABASE_URL.match(/^https?:\/\/([^.\s]+)\.supabase\.co/i);
  return match ? `sb-${match[1]}` : null;
})();

const STATIC_COOKIE_NAMES = new Set([
  'sb-access-token',
  'sb-refresh-token',
  'sb:token',
  'supabase-auth-token',
  'supabase-session',
]);

function isSupabaseCookie(name: string): boolean {
  if (!name) return false;
  if (STATIC_COOKIE_NAMES.has(name)) return true;
  if (name.startsWith('sb-') && /-(access|refresh|auth)-token$/.test(name)) return true;
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
  const reqCookies = req.cookies.getAll?.() ?? [];
  if (reqCookies.some((c) => isSupabaseCookie(c.name))) return true;
  if (res) {
    const resCookies = res.cookies.getAll?.() ?? [];
    if (resCookies.some((c) => isSupabaseCookie(c.name))) return true;
  }
  return false;
}

/** ---------- Access policy ---------- */

const AUTH_REQUIRED_PREFIXES = ['/account', '/admin', '/dashboard'];

function requiresAuth(pathname: string) {
  // ???????? ???? ????????? ????
  return AUTH_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** ---------- URL sanitizer ---------- */

function sanitizeRequestUrl(request: NextRequest): NextResponse | null {
  if (request.method !== 'GET') return null; // ?? ?????????? ???????????? ??????
  const url = request.nextUrl.clone();
  if (!url.search) return null;

  let mutated = false;
  for (const [key, value] of url.searchParams.entries()) {
    const sanitized = sanitizeSearchParam(value);
    if (!isSanitized(value, sanitized)) continue;
    mutated = true;
    if (sanitized) url.searchParams.set(key, sanitized);
    else url.searchParams.delete(key);
  }

  if (!mutated) return null;
  url.hash = '';
  return NextResponse.redirect(url, 302);
}

/** ---------- Main middleware ---------- */

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // ?????????? ????????? ? ??????????? ????
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.startsWith('/assets') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/favicon.ico' ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map|txt|xml|ico)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // ????????? ???????? ?? ??????????
  if (pathname === '/' || pathname.startsWith('/api/public')) {
    const unsafe = sanitizeRequestUrl(request);
    return unsafe ?? NextResponse.next();
  }

  if (pathname.startsWith('/login')) {
    const unsafe = sanitizeRequestUrl(request);
    return unsafe ?? NextResponse.next();
  }

  // ?????????? GET-??????????
  const unsafe = sanitizeRequestUrl(request);
  if (unsafe) return unsafe;

  const needsAuth = requiresAuth(pathname);
  if (!needsAuth) {
    return NextResponse.next();
  }

  // ?????????? ????/?????? ????? Supabase middleware
  const response = supabaseMiddleware(request);

  // ?????? ????????? ???????
  const authed = hasAuthCookie(request, response);
  if (!authed) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname + (search || ''));
    return NextResponse.redirect(url);
  }

  return response;
}

/**
 * Matcher: ?? ??????? _next, _vercel, ???????, favicons ? robots/sitemap/manifest.
 * API ????? ???? ?????????, ???? ?? ????? edge-??? (?????? `|api/` ? ?????????? lookahead).
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|_vercel|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map|txt|xml|ico)$).*)',
  ],
};
