import { NextResponse } from "next/server";

import { getAdminClient } from "@/utils/supabase/admin";

export async function GET() {
  const startedAt = Date.now();
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from("settings").select("id").limit(1);

    return NextResponse.json(
      {
        ok: !error,
        time: new Date().toISOString(),
        supabase: { ok: !error },
        duration_ms: Date.now() - startedAt,
      },
      {
        status: error ? 503 : 200,
        headers: { "cache-control": "no-store" },
      },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        time: new Date().toISOString(),
        supabase: { ok: false, error: String(error?.message ?? error) },
        duration_ms: Date.now() - startedAt,
      },
      {
        status: 500,
        headers: { "cache-control": "no-store" },
      },
    );
  }
}

