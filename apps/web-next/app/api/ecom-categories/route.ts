import { NextResponse } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("ecom_categories")
      .select("slug,name")
      .order("name");

    if (error) return json({ ok: false, error: error.message || "db" }, 500);
    const items = Array.isArray(data) ? data : [];
    return json({ ok: true, items });
  } catch (error: unknown) {
    return json({ ok: false, error: String((error as Error)?.message ?? error) }, 500);
  }
}
