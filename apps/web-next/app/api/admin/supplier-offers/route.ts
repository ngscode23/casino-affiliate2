import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const OFFER_FIELDS =
  "id, supplier_id, sku_id, supplier_sku_id, price_cents, currency, cost_cents, lead_time_days, min_order_qty, max_order_qty, valid_from, valid_to, status, metadata, created_at, updated_at";
const SUPPLIER_FIELDS = "id, name, code";
const SKU_FIELDS = "id, sku, slug, title, currency";
const SUPPLIER_SKU_FIELDS = "id, supplier_sku";

const DEFAULT_LIMIT = 200;

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const supplierId = normalizeString(url.searchParams.get("supplier_id"));
  const skuId = normalizeString(url.searchParams.get("sku_id"));
  const status = normalizeString(url.searchParams.get("status"));
  const q = normalizeString(url.searchParams.get("q"));
  const limit = Math.min(Number(url.searchParams.get("limit") || DEFAULT_LIMIT), 1000);

  const supabase = getAdminClient();

  let skuIds: string[] = [];
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    const { data } = await supabase
      .from("ecom_products")
      .select("id")
      .or(`sku.ilike.${pattern},slug.ilike.${pattern},title.ilike.${pattern}`)
      .limit(200);
    skuIds = Array.isArray(data) ? data.map((row) => String((row as any).id)) : [];
    if (!skuIds.length) {
      return json({ ok: true, items: [] }, 200);
    }
  }

  let query = supabase
    .from("supplier_offers")
    .select(
      `${OFFER_FIELDS}, suppliers(${SUPPLIER_FIELDS}), ecom_products(${SKU_FIELDS}), supplier_skus(${SUPPLIER_SKU_FIELDS})`,
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (supplierId) query = query.eq("supplier_id", supplierId);
  if (skuId) query = query.eq("sku_id", skuId);
  if (status) query = query.eq("status", status);
  if (q && skuIds.length) query = query.in("sku_id", skuIds);

  const { data, error } = await query;
  if (error) {
    return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
  }

  return json({ ok: true, items: data ?? [] }, 200);
}
