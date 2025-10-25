import { NextResponse } from "next/server";

import { requireAuth } from "@/utils/auth/guard";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) {
    if (auth.response.status === 401) {
      return NextResponse.json(
        { ok: false, user: null },
        {
          status: 200,
          headers: { "cache-control": "no-store" },
        },
      );
    }
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
