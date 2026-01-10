import { NextRequest } from "next/server";

import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const PO_FIELDS =
  "id, order_id, supplier_id, status, currency, total_cost_cents, sent_at, confirmed_at, shipped_at, cancelled_at, created_at, error_message, metadata";
const ITEM_FIELDS =
  "id, purchase_order_id, order_item_id, sku_id, qty, cost_cents, currency, supplier_sku_snapshot, title_snapshot, metadata";
const ALLOWED_STATUSES = new Set(["pending", "sent", "confirmed", "shipped", "failed", "cancelled"]);

export async function GET(request: NextRequest, context: { params: Promise<{ poId: string }> }) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { poId } = await context.params;
  const id = (poId ?? "").trim();
  if (!id) return json({ ok: false, error: "id_required" }, 400);

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      `${PO_FIELDS}, suppliers(id, name, code), purchase_order_items(${ITEM_FIELDS}, ecom_products(id, sku, slug, title, currency))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
  if (!data) return json({ ok: false, error: "not_found" }, 404);

  return json({ ok: true, item: data }, 200);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ poId: string }> }) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { poId } = await context.params;
  const id = (poId ?? "").trim();
  if (!id) return json({ ok: false, error: "id_required" }, 400);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const updates: Record<string, unknown> = {};
  if ("status" in payload) {
    const status = String(payload.status ?? "").trim().toLowerCase();
    if (!ALLOWED_STATUSES.has(status)) return json({ ok: false, error: "status_invalid" }, 400);
    updates.status = status;
    if (status === "sent" && !payload.sent_at) updates.sent_at = new Date().toISOString();
    if (status === "confirmed" && !payload.confirmed_at) updates.confirmed_at = new Date().toISOString();
    if (status === "shipped" && !payload.shipped_at) updates.shipped_at = new Date().toISOString();
    if (status === "cancelled" && !payload.cancelled_at) updates.cancelled_at = new Date().toISOString();
  }

  if ("sent_at" in payload) updates.sent_at = payload.sent_at ?? null;
  if ("confirmed_at" in payload) updates.confirmed_at = payload.confirmed_at ?? null;
  if ("shipped_at" in payload) updates.shipped_at = payload.shipped_at ?? null;
  if ("cancelled_at" in payload) updates.cancelled_at = payload.cancelled_at ?? null;
  if ("error_message" in payload) updates.error_message = payload.error_message ?? null;
  if ("metadata" in payload) updates.metadata = payload.metadata ?? {};

  if (!Object.keys(updates).length) return json({ ok: false, error: "no_updates" }, 400);

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .update(updates)
    .eq("id", id)
    .select(
      `${PO_FIELDS}, suppliers(id, name, code), purchase_order_items(${ITEM_FIELDS}, ecom_products(id, sku, slug, title, currency))`,
    )
    .maybeSingle();

  if (error) return json({ ok: false, error: "update_failed", message: error.message }, 500);
  if (!data) return json({ ok: false, error: "not_found" }, 404);

  return json({ ok: true, item: data }, 200);
}
