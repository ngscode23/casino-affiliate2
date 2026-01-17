import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

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
  const q = normalizeString(url.searchParams.get("q"));
  const limit = Math.min(Number(url.searchParams.get("limit") || DEFAULT_LIMIT), 1000);

  if (!supplierId) {
    return json({ ok: false, error: "supplier_id_required" }, 400);
  }

  const supabase = getAdminClient();
  const table = "supplier_feed_unmapped" as any;

  let query = supabase
    .from(table)
    .select("id, supplier_id, vendor_sku, last_seen_at, sample_payload, created_at, updated_at")
    .eq("supplier_id", supplierId)
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    query = query.ilike("vendor_sku", pattern);
  }

  const { data, error } = await query;
  if (error) {
    return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
  }

  return json({ ok: true, items: data ?? [] }, 200);
}
