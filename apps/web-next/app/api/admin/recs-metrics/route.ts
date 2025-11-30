import { NextResponse } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

function normalizeDays(input: string | null): number {
  const parsed = Number(input);
  if (!input || Number.isNaN(parsed) || !Number.isFinite(parsed)) return 14;
  return Math.max(1, Math.min(60, Math.round(parsed)));
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const supabase = getAdminClient();
  const url = new URL(request.url);
  const days = normalizeDays(url.searchParams.get("days"));

  const { data, error } = await supabase.rpc("recs_metrics", { p_days: days });
  if (error) {
    return NextResponse.json({ ok: false, code: "rpc_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      days,
      metrics: Array.isArray(data) ? data : [],
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
