import { NextResponse } from "next/server";

import { requireAuth } from "@/utils/auth/guard";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(
    {
      ok: true,
      user: auth.user,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

