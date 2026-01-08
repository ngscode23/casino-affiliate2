import { NextResponse } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";

const MESSAGE = "Legacy admin-products API is disabled. Use /admin/catalog and catalog_products_v.";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  return json({ ok: false, error: "deprecated", message: MESSAGE }, 410);
}

export function GET() {
  return json({ ok: false, error: "method_not_allowed" }, 405);
}
