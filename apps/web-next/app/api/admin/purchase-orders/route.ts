import { NextRequest } from "next/server";

import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const PO_FIELDS =
  "id, order_id, supplier_id, status, currency, total_cost_cents, sent_at, confirmed_at, shipped_at, cancelled_at, created_at, error_message";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const supplierId = (url.searchParams.get("supplier_id") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);

  const supabase = getAdminClient();
  let query = supabase
    .from("purchase_orders")
    .select(`${PO_FIELDS}, suppliers(id, name, code)`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (supplierId) query = query.eq("supplier_id", supplierId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
  }

  return json({ ok: true, items: data ?? [] }, 200);
}
