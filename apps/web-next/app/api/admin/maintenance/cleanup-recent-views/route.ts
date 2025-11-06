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
    return json({ ok: false, code: "misconfig", message: "ADMIN_TOKEN missing" }, 500);
  }
  const headerToken =
    request.headers.get("x-admin-token") ??
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

  try {
    const supabase = getAdminClient();
    const { error } = await (supabase as any).rpc("cleanup_recent_views");
    if (error) {
      return json({ ok: false, code: "db", message: error.message }, 500);
    }
    return json({ ok: true });
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

