import { NextRequest } from "next/server";

import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const RUN_FIELDS =
  "id, supplier_id, status, started_at, finished_at, error, stats, created_at, updated_at";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const supplierId = (url.searchParams.get("supplier_id") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);

  const supabase = getAdminClient();
  let query = supabase
    .from("supplier_feed_runs")
    .select(`${RUN_FIELDS}, suppliers(id, name, code)`)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (supplierId) query = query.eq("supplier_id", supplierId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
  }

  return json({ ok: true, items: data ?? [] }, 200);
}
