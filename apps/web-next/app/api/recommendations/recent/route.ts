import { cookies } from "next/headers";

import { json } from "@/app/api/orders/utils";
import { getAdminClient } from "@/utils/supabase/admin";
import { resolveViewerIdentity } from "@/utils/auth/viewer";
import { normalizeImageUrl } from "@/app/products/[slug]/data";
import { formatCurrency } from "@/app/products/currency";
import type { ProductGridItem } from "@/components/ProductGrid";

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const DEFAULT_RECENT_LIMIT = 8;
const DEFAULT_RECOMMENDED_LIMIT = 12;
const MAX_LIMIT = 48;
const ANON_COOKIE_NAME = "anon_id";
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const CATALOG_VIEW = "catalog_products_v";
const PUBLISHED_STATUS = "published";

type CatalogProductRow = {
  id: string;
  slug: string | null;
  title: string | null;
  description?: string | null;
  price?: number | string | null;
  currency?: string | null;
  thumbnail_url?: string | null;
  status?: string | null;
  created_at?: string | null;
};

function clampLimit(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(parsed, MAX_LIMIT));
}

function normalizeStatus(status: string | null | undefined): string {
  return typeof status === "string" ? status.trim().toLowerCase() : "";
}

function normalizePrice(row: CatalogProductRow): number | null {
  if (row.price != null) {
    const value = Number(row.price);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function mapProductToGridItem(row: CatalogProductRow): ProductGridItem | null {
  if (!row.id || !row.slug) return null;
  const priceValue = normalizePrice(row);
  const currency = typeof row.currency === "string" && row.currency.trim() ? row.currency.trim() : "USD";
  const priceLabel = priceValue != null ? formatCurrency(priceValue, currency) : null;
  const image = normalizeImageUrl(row.thumbnail_url ?? null) ?? undefined;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title ?? row.slug,
    subtitle: row.description ?? undefined,
    price: priceLabel ?? undefined,
    image,
  };
}

function sanitizeUuidList(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === "string" && UUID_PATTERN.test(value))),
  );
}

async function resolveActor(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const { anonId, userId } = resolveViewerIdentity(cookieStore);
  let actor = anonId && UUID_PATTERN.test(anonId) ? anonId : null;
  let shouldSetAnonCookie = false;

  if (!actor) {
    const fallback = userId && UUID_PATTERN.test(userId) ? userId : null;
    actor = fallback ?? crypto.randomUUID();
    shouldSetAnonCookie = true;
  }

  return { actor, shouldSetAnonCookie };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const recentLimit = clampLimit(url.searchParams.get("limit"), DEFAULT_RECENT_LIMIT);
  const recommendedLimit = clampLimit(url.searchParams.get("similarLimit"), DEFAULT_RECOMMENDED_LIMIT);
  const excludeSlugRaw = (url.searchParams.get("excludeSlug") || "").toLowerCase().trim();
  const excludeIdRaw = url.searchParams.get("excludeId");
  const excludeId = excludeIdRaw && UUID_PATTERN.test(excludeIdRaw) ? excludeIdRaw : null;

  const cookieStore = await cookies();
  const { actor, shouldSetAnonCookie } = await resolveActor(cookieStore);
  const supabase = getAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("opt_out")
    .eq("anon_id", actor)
    .maybeSingle();

  if (profileError) {
    return json({ ok: false, code: "db_error", message: profileError.message }, 500);
  }

  if (profile?.opt_out) {
    const response = json({ ok: true, recent: [], recommended: [], opt_out: true }, 200);
    if (shouldSetAnonCookie) {
      response.cookies.set({
        name: ANON_COOKIE_NAME,
        value: actor,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        maxAge: ANON_COOKIE_MAX_AGE,
      });
    }
    return response;
  }

  // Use user_events as the canonical event stream for the new catalog.
  // recent_views is legacy and tied to ecom_products FK; do not use it.
  const { data: events, error: eventsError } = await supabase
    .from("user_events")
    .select("product_id, ts")
    .eq("anon_id", actor)
    .in("event", ["view", "click", "add_to_cart", "purchase"])
    .not("product_id", "is", null)
    .order("ts", { ascending: false })
    .limit(recentLimit * 6);

  if (eventsError) {
    return json({ ok: false, code: "db_error", message: eventsError.message }, 500);
  }

  const recentIds = sanitizeUuidList((events ?? []).map((row: any) => row?.product_id));
  const recentItems: ProductGridItem[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  if (recentIds.length) {
    const { data: products, error: productsError } = await supabase
      .from(CATALOG_VIEW)
      .select("id, slug, title, description, price, currency, thumbnail_url, status, created_at")
      .eq("status", PUBLISHED_STATUS)
      .in("id", recentIds);

    if (productsError) {
      return json({ ok: false, code: "db_error", message: productsError.message }, 500);
    }

    const productMap = new Map<string, CatalogProductRow>();
    for (const row of (products as unknown as CatalogProductRow[] | null) ?? []) {
      if (row?.id) productMap.set(row.id, row);
    }

    for (const id of recentIds) {
      const row = productMap.get(id);
      if (!row) continue;
      if (excludeId && row.id === excludeId) continue;
      if (!row.slug) continue;
      if (excludeSlugRaw && row.slug.toLowerCase() === excludeSlugRaw) continue;
      const status = normalizeStatus(row.status);
      if (status && status !== PUBLISHED_STATUS) continue;
      if (seenSlugs.has(row.slug)) continue;

      const item = mapProductToGridItem(row);
      if (!item) continue;
      recentItems.push(item);
      seenIds.add(row.id);
      seenSlugs.add(row.slug);
      if (recentItems.length >= recentLimit) break;
    }
  }

  // Recommended: simple trending fallback for the new catalog (latest published products),
  // until similarity models are rebuilt for catalog.* ids.
  const { data: trendingRows, error: trendingError } = await supabase
    .from(CATALOG_VIEW)
    .select("id, slug, title, description, price, currency, thumbnail_url, status, created_at")
    .eq("status", PUBLISHED_STATUS)
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(Math.max(recommendedLimit * 3, 30));

  if (trendingError) {
    return json({ ok: false, code: "db_error", message: trendingError.message }, 500);
  }

  const recommendedItems: ProductGridItem[] = [];
  for (const row of (trendingRows as unknown as CatalogProductRow[] | null) ?? []) {
    if (!row?.id || !row.slug) continue;
    if (excludeId && row.id === excludeId) continue;
    if (excludeSlugRaw && row.slug.toLowerCase() === excludeSlugRaw) continue;
    if (seenIds.has(row.id)) continue;
    if (seenSlugs.has(row.slug)) continue;
    const item = mapProductToGridItem(row);
    if (!item) continue;
    recommendedItems.push(item);
    seenIds.add(row.id);
    seenSlugs.add(row.slug);
    if (recommendedItems.length >= recommendedLimit) break;
  }

  const response = json(
    {
      ok: true,
      recent: recentItems,
      recommended: recommendedItems,
    },
    200,
  );

  if (shouldSetAnonCookie) {
    response.cookies.set({
      name: ANON_COOKIE_NAME,
      value: actor,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: ANON_COOKIE_MAX_AGE,
    });
  }

  return response;
}
