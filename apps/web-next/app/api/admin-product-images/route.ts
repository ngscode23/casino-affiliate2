import { NextResponse } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";

const MESSAGE = "Legacy product image API is disabled. Use the new catalog media workflow.";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  return json({ ok: false, error: "deprecated", message: MESSAGE }, 410);
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  return json({ ok: false, error: "deprecated", message: MESSAGE }, 410);
}
