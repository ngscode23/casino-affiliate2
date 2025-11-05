import { NextResponse } from "next/server";

import { requireAuth } from "@/utils/auth/guard";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) {
    if (auth.response.status === 401) {
      return NextResponse.json(
        { ok: false, user: null, session: null },
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
      session: {
        accessToken: auth.accessToken,
        expiresAt: auth.expiresAt,
        expiresIn: auth.expiresIn,
        tokenType: auth.tokenType,
      },
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
