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
import { updateSession } from "@/utils/supabase/middleware";

const AUTH_COOKIE_CANDIDATES = [
  // новые SDK
  "sb-access-token",
  "sb-refresh-token",
  // возможные «старые»/кастомные
  "sb:token",
  "supabase-auth-token",
  "supabase-session",
];

function hasAuthCookie(req: NextRequest, res?: NextResponse) {
  // проверяем и запрос, и (на всякий случай) ответ после updateSession —
  // вдруг helper уже освежил куки
  const fromReq = AUTH_COOKIE_CANDIDATES.some((n) => req.cookies.has(n));
  if (fromReq) return true;
  if (res) {
    const fromRes = AUTH_COOKIE_CANDIDATES.some((n) => res.cookies.get(n));
    if (fromRes) return true;
  }
  return false;
}

function requiresAuth(pathname: string) {
  // добавляй сюда приватные зоны при необходимости
  // Временно разрешаем доступ к /checkout без авторизации, чтобы не блокировать оплату
  return pathname.startsWith("/account");
}

export async function middleware(request: NextRequest) {
  // 1) обновляем сессию через ваш supabase-helper
  const response = await updateSession(request);

  const { pathname, search } = request.nextUrl;

  // 2) пропускаем спец-роуты (логин, публичные API и т.п.)
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/public") ||
    pathname === "/"
  ) {
    return response;
  }

  // 3) если это защищённая зона — нужна авторизация
  if (requiresAuth(pathname)) {
    const isAuthed = hasAuthCookie(request, response);
    if (!isAuthed) {
      const url = new URL("/login", request.url);
      // возвращаем пользователя назад после логина
      const redirectTo = pathname + (search || "");
      url.searchParams.set("redirect", redirectTo);
      return NextResponse.redirect(url);
    }
  }

  // 4) иначе — как обычно
  return response;
}

/**
 * Матчер оставил как у тебя: пропускаем статику, оптимизацию картинок и favicons.
 * При желании можно расширить исключения (например, /health, /sitemap.xml и т.п.)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
