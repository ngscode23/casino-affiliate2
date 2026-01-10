import { NextRequest } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const PO_FIELDS =
  "id, order_id, supplier_id, status, currency, total_cost_cents, sent_at, confirmed_at, shipped_at, cancelled_at, created_at, error_message";
const ITEM_FIELDS =
  "id, purchase_order_id, order_item_id, sku_id, qty, cost_cents, currency, supplier_sku_snapshot, title_snapshot";

function toCsvValue(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest, context: { params: Promise<{ poId: string }> }) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { poId } = await context.params;
  const id = (poId ?? "").trim();
  if (!id) {
    return new Response(JSON.stringify({ ok: false, error: "id_required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      `${PO_FIELDS}, suppliers(id, name, code, contact_email), purchase_order_items(${ITEM_FIELDS}, ecom_products(id, sku, slug, title, currency))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: "fetch_failed", message: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  if (!data) {
    return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const po = data as any;
  const items = Array.isArray(po.purchase_order_items) ? po.purchase_order_items : [];
  const header = [
    "PO ID",
    "Order ID",
    "Supplier",
    "Status",
    "Currency",
    "Total Cost (cents)",
    "Sent at",
    "Confirmed at",
    "Shipped at",
    "Cancelled at",
    "Error",
  ];
  const lines = [
    header.map(toCsvValue).join(","),
    [
      po.id,
      po.order_id,
      po.suppliers?.name ?? po.supplier_id ?? "",
      po.status,
      po.currency ?? "",
      po.total_cost_cents ?? "",
      po.sent_at ?? "",
      po.confirmed_at ?? "",
      po.shipped_at ?? "",
      po.cancelled_at ?? "",
      po.error_message ?? "",
    ]
      .map(toCsvValue)
      .join(","),
    "",
    ["Items:"].map(toCsvValue).join(","),
    ["item_id", "sku_id", "supplier_sku", "title", "qty", "cost_cents", "currency"].map(toCsvValue).join(","),
    ...items.map((item: any) =>
      [
        item.id,
        item.sku_id,
        item.supplier_sku_snapshot ?? "",
        item.title_snapshot ?? item.ecom_products?.title ?? "",
        item.qty,
        item.cost_cents ?? "",
        item.currency ?? item.ecom_products?.currency ?? po.currency ?? "",
      ]
        .map(toCsvValue)
        .join(","),
    ),
  ];

  const csv = lines.join("\n");
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="purchase-order-${po.id}.csv"`,
      "cache-control": "no-store",
    },
  });
}
