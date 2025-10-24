import { NextResponse, type NextRequest } from "next/server";

// Edge-safe middleware: не тащит supabase-js/realtime, только куки и редиректы
export const config = { matcher: ["/dashboard/:path*", "/account/:path*"] };

export function middleware(req: NextRequest) {
  const token = req.cookies.get("sb-access-token")?.value;
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirectedFrom", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
