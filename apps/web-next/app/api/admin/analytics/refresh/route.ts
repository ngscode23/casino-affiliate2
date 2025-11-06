import { NextResponse } from "next/server";

import { getAdminClient } from "@/utils/supabase/admin";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim() ?? "";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function validateToken(request: Request) {
  if (!ADMIN_TOKEN) {
    return json({
      ok: false,
      code: "misconfig",
      message: "ADMIN_TOKEN missing",
    }, 500);
  }
  const headerToken = request.headers.get("x-admin-token") ??
    request.headers.get("X-Admin-Token") ??
    "";
  if (headerToken.trim() !== ADMIN_TOKEN) {
    return json({ ok: false, code: "unauthorized" }, 403);
  }
  return null;
}

export async function POST(request: Request) {
  const tokenError = validateToken(request);
  if (tokenError) return tokenError;

  const supabase = getAdminClient();
  try {
    // сначала пытаемся вызвать основную функцию, используем fallback при несовпадении имени
    let error = null as any;
    let called: "mviews" | "mvs" | null = null;
    {
      const res = await (supabase as any).rpc("refresh_analytics_mviews");
      error = res.error;
      if (!error) called = "mviews";
    }
    if (error) {
      const res2 = await (supabase as any).rpc("refresh_analytics_mvs");
      if (!res2.error) called = "mvs";
      else error = res2.error;
    }
    if (!called) {
      return json({
        ok: false,
        code: "db",
        message: String(error?.message || "rpc_failed"),
      }, 500);
    }
    return json({ ok: true, method: called });
  } catch (error: any) {
    return json(
      { ok: false, code: "internal", message: String(error?.message ?? error) },
      500,
    );
  }
}

export function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
