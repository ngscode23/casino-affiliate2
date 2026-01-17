import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const CATALOG_FIELDS = "id, slug, title, status, brand_id, brands(name, slug)";

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function buildSearchPattern(term: string): string {
  const escaped = term.replace(/[\\%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const query = normalizeString(url.searchParams.get("q"));
  const brandId = normalizeString(url.searchParams.get("brand_id"));
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 50)) : 20;

  const catalogClient = getAdminClient("catalog");
  let queryBuilder = catalogClient
    .from("products")
    .select(CATALOG_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (query) {
    const pattern = buildSearchPattern(query);
    queryBuilder = queryBuilder.or(`title.ilike.${pattern},slug.ilike.${pattern}`);
  }

  if (brandId) {
    queryBuilder = queryBuilder.eq("brand_id", brandId);
  }

  const { data, error } = await queryBuilder;
  if (error) {
    return json({ ok: false, error: "search_failed", message: error.message }, 500);
  }

  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    brand_id: row.brand_id ?? null,
    brand_name: row.brands?.name ?? null,
    brand_slug: row.brands?.slug ?? null,
  }));

  return json({ ok: true, items }, 200);
}
