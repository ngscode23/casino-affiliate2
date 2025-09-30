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
  return pathname.startsWith("/checkout") || pathname.startsWith("/account");
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
