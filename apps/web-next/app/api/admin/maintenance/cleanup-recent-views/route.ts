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
    // recent_views is legacy (tied to ecom products). We now use user_events as canonical stream.
    // Keeping this endpoint for backwards-compat, but no cleanup is required anymore.
    void getAdminClient(); // ensure env/config is still valid
    return json({ ok: true, deprecated: true, message: "recent_views cleanup is deprecated; use user_events." });
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
