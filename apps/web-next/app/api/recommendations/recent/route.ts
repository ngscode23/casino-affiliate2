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
const ACTIVE_STATUSES = new Set(["active", "published"]);
const ANON_COOKIE_NAME = "anon_id";
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

type RecentViewRow = {
  product_id: string;
  seen_at: string;
  weight: number | null;
  product: ProductRow | null;
};

type ProductRow = {
  id: string;
  slug: string | null;
  title: string | null;
  description?: string | null;
  price?: number | string | null;
  price_cents?: number | string | null;
  currency?: string | null;
  main_image_url?: string | null;
  status?: string | null;
  rating?: number | null;
};

type CoViewedRow = {
  product_a: string;
  product_b: string;
  score: number | null;
};

function clampLimit(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(parsed, MAX_LIMIT));
}

function normalizeStatus(status: string | null | undefined): string {
  return typeof status === "string" ? status.trim().toLowerCase() : "";
}

function normalizePrice(row: ProductRow): number | null {
  if (row.price_cents != null) {
    const cents = Number(row.price_cents);
    if (Number.isFinite(cents)) return cents / 100;
  }
  if (row.price != null) {
    const value = Number(row.price);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function mapProductToGridItem(row: ProductRow): ProductGridItem | null {
  if (!row.id || !row.slug) return null;
  const priceValue = normalizePrice(row);
  const currency = typeof row.currency === "string" && row.currency.trim() ? row.currency.trim() : "EUR";
  const priceLabel = priceValue != null ? formatCurrency(priceValue, currency) : null;
  const image = normalizeImageUrl(row.main_image_url ?? null) ?? undefined;
  const rating = typeof row.rating === "number" && Number.isFinite(row.rating) ? row.rating : null;
  const meta = rating != null ? `\u2605 ${rating.toFixed(1)}` : null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title ?? row.slug,
    subtitle: row.description ?? undefined,
    price: priceLabel ?? undefined,
    meta,
    image,
  };
}

function sanitizeUuidList(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => UUID_PATTERN.test(value))));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const recentLimit = clampLimit(url.searchParams.get("limit"), DEFAULT_RECENT_LIMIT);
  const similarLimit = clampLimit(url.searchParams.get("similarLimit"), DEFAULT_RECOMMENDED_LIMIT);
  const excludeSlugRaw = (url.searchParams.get("excludeSlug") || "").toLowerCase().trim();
  const excludeIdRaw = url.searchParams.get("excludeId");
  const excludeId = excludeIdRaw && UUID_PATTERN.test(excludeIdRaw) ? excludeIdRaw : null;

  const cookieStore = await cookies();
  const identity = resolveViewerIdentity(cookieStore);
  const { userId } = identity;
  let { anonId } = identity;
  let shouldSetAnonCookie = false;

  if (!userId && !anonId) {
    anonId = crypto.randomUUID();
    shouldSetAnonCookie = true;
  }

  const supabase = getAdminClient();
  const identities: Array<{ column: "user_id" | "anon_id"; value: string }> = [];
  if (userId) identities.push({ column: "user_id", value: userId });
  if (anonId) identities.push({ column: "anon_id", value: anonId });

  let recentRows: RecentViewRow[] = [];
  let activeIdentity: "user" | "anon" | null = null;

  for (const candidate of identities) {
    const { data, error } = await supabase
      .from("recent_views")
      .select(
        "product_id, seen_at, weight, product:products(id, slug, title, description:short_desc, price, price_cents, currency, main_image_url, status, rating)",
      )
      .eq(candidate.column, candidate.value)
      .order("seen_at", { ascending: false })
      .limit(recentLimit * 5);

    if (error) {
      return json({ ok: false, code: "db_error", message: error.message }, 500);
    }

    const rows = (data as unknown as RecentViewRow[] | null) ?? [];
    if (rows.length && activeIdentity == null) {
      recentRows = rows;
      activeIdentity = candidate.column === "user_id" ? "user" : "anon";
      break;
    }
    if (!recentRows.length && rows.length) {
      recentRows = rows;
      activeIdentity = candidate.column === "user_id" ? "user" : "anon";
    }
  }

  const recentItems: ProductGridItem[] = [];
  const recentProductIds: string[] = [];
  const seenSlugs = new Set<string>();

  for (const row of recentRows) {
    if (!row?.product) continue;
    const product = row.product;
    if (!product.id || !product.slug) continue;
    if (excludeId && product.id === excludeId) continue;
    if (product.slug.toLowerCase() === excludeSlugRaw) continue;
    if (seenSlugs.has(product.slug)) continue;
    const status = normalizeStatus(product.status);
    if (status && !ACTIVE_STATUSES.has(status)) continue;
    const item = mapProductToGridItem(product);
    if (!item) continue;
    recentItems.push(item);
    recentProductIds.push(product.id);
    seenSlugs.add(product.slug);
    if (recentItems.length >= recentLimit) break;
  }

  const recommendedItems: ProductGridItem[] = [];

  if (recentProductIds.length > 0) {
    const uniqueIds = sanitizeUuidList(recentProductIds);
    if (uniqueIds.length > 0) {
      const inClause = `(${uniqueIds.join(",")})`;
      const { data: coData, error: coError } = await supabase
        .from("co_viewed_mv")
        .select("product_a, product_b, score")
        .or(`product_a.in.${inClause},product_b.in.${inClause}`)
        .order("score", { ascending: false })
        .limit(similarLimit * 6);

      if (coError) {
        return json({ ok: false, code: "db_error", message: coError.message }, 500);
      }

      const candidateScores = new Map<string, number>();
      const recentIdSet = new Set(uniqueIds);
      for (const row of (coData as unknown as CoViewedRow[] | null) ?? []) {
        if (!row) continue;
        const score = typeof row.score === "number" && Number.isFinite(row.score) ? row.score : 0;
        const { product_a: a, product_b: b } = row;
        if (!UUID_PATTERN.test(a) || !UUID_PATTERN.test(b)) continue;
        let candidate: string | null = null;
        if (recentIdSet.has(a) && !recentIdSet.has(b)) candidate = b;
        else if (recentIdSet.has(b) && !recentIdSet.has(a)) candidate = a;
        if (!candidate || (excludeId && candidate === excludeId)) continue;
        const prev = candidateScores.get(candidate) ?? 0;
        if (score > prev) candidateScores.set(candidate, score);
      }

      if (candidateScores.size > 0) {
        const orderedCandidates = Array.from(candidateScores.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([id]) => id)
          .slice(0, similarLimit * 2);

        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("id, slug, title, description:short_desc, price, price_cents, currency, main_image_url, status, rating")
          .in("id", orderedCandidates);

        if (productError) {
          return json({ ok: false, code: "db_error", message: productError.message }, 500);
        }

        const productMap = new Map<string, ProductRow>();
        for (const row of (productData as unknown as ProductRow[] | null) ?? []) {
          if (row?.id) productMap.set(row.id, row);
        }

        const recommendedSeenSlugs = new Set(seenSlugs);
        for (const candidateId of orderedCandidates) {
          const row = productMap.get(candidateId);
          if (!row) continue;
          const status = normalizeStatus(row.status);
          if (status && !ACTIVE_STATUSES.has(status)) continue;
          if (!row.slug || recommendedSeenSlugs.has(row.slug)) continue;
          if (excludeSlugRaw && row.slug.toLowerCase() === excludeSlugRaw) continue;
          const item = mapProductToGridItem(row);
          if (!item) continue;
          recommendedItems.push(item);
          recommendedSeenSlugs.add(row.slug);
          if (recommendedItems.length >= similarLimit) break;
        }
      }
    }
  }

  const response = json(
    {
      ok: true,
      identity: activeIdentity,
      recent: recentItems,
      recommended: recommendedItems,
    },
    200,
  );

  if (shouldSetAnonCookie && anonId) {
    response.cookies.set({
      name: ANON_COOKIE_NAME,
      value: anonId,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: ANON_COOKIE_MAX_AGE,
    });
  }

  return response;
}
