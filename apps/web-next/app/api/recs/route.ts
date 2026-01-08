import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { json } from "@/app/api/orders/utils";
import { formatCurrency } from "@/app/products/currency";
import { normalizeImageUrl } from "@/app/products/[slug]/data";
import type { ProductGridItem } from "@/components/ProductGrid";
import { resolveViewerIdentity } from "@/utils/auth/viewer";
import { getAdminClient } from "@/utils/supabase/admin";

const ALLOWED_EVENTS = new Set(["view", "click", "impression", "add_to_cart", "purchase", "search"]);
const LEGACY_ANON_COOKIE_NAME = "anon_id";
const AID_COOKIE_NAME = "aid";
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const MAX_REASON_ITEMS = 3;
const TRENDING_POOL = 50;
const PUBLISHED_STATUS = "published";
const CATALOG_VIEW = "catalog_products_recs_v";

const SELECT_COLUMNS =
  "id, slug, title, description, price, currency, thumbnail_url, status, created_at, brand_id, brand_slug, brand_name, category_id, category_slug, category_title, views_total";

type CatalogRecRow = {
  id: string;
  slug: string | null;
  title: string | null;
  description?: string | null;
  price?: number | string | null;
  currency?: string | null;
  thumbnail_url?: string | null;
  status?: string | null;
  created_at?: string | null;
  brand_id?: string | null;
  brand_slug?: string | null;
  brand_name?: string | null;
  category_id?: string | null;
  category_slug?: string | null;
  category_title?: string | null;
  views_total?: number | string | null;
};

type EventRow = { product_id: string | null };

type AffinityEntry = { id: string; slug?: string | null; title?: string | null; count: number };
type BrandEntry = { id: string; slug?: string | null; name?: string | null; count: number };

type ScoredCandidate = {
  row: CatalogRecRow;
  sources: Set<string>;
  score: number;
  breakdown: {
    catAffinity: number;
    brandAffinity: number;
    priceSimilarity: number;
    popularity: number;
  };
};

type ApiRecItem = ProductGridItem & {
  score: number;
  reason: string | null;
  is_featured?: boolean;
  category_id?: string | null;
  category_slug?: string | null;
  category_title?: string | null;
  brand_id?: string | null;
  brand_slug?: string | null;
  brand_name?: string | null;
  views_total?: number;
};

function withLegacyAnonCookie(response: NextResponse, actor: string, shouldSet: boolean) {
  if (!shouldSet) return response;
  response.cookies.set({
    name: LEGACY_ANON_COOKIE_NAME,
    value: actor,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: ANON_COOKIE_MAX_AGE,
  });
  return response;
}

async function resolveActorForLegacy() {
  const cookieStore = await cookies();
  const { userId, anonId } = resolveViewerIdentity(cookieStore);
  let actor = anonId && UUID_PATTERN.test(anonId) ? anonId : null;
  let shouldSetAnonCookie = false;

  if (!actor) {
    const fallback = userId && UUID_PATTERN.test(userId) ? userId : null;
    actor = fallback ?? crypto.randomUUID();
    shouldSetAnonCookie = true;
  }

  return { actor, shouldSetAnonCookie };
}

function parseNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function clampLimit(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(parsed, MAX_LIMIT));
}

function normalizeStatus(status: string | null | undefined): string {
  return typeof status === "string" ? status.trim().toLowerCase() : "";
}

function parsePrice(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value: number | null, currency: string | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const code = currency && currency.trim().length === 3 ? currency.trim().toUpperCase() : "USD";
  return formatCurrency(value, code);
}

function buildMeta(row: CatalogRecRow): string | null {
  const parts = [row.brand_name, row.category_title].filter((item) => typeof item === "string" && item.trim());
  return parts.length ? parts.join("\u0007") : null;
}

function mapRowToGridItem(row: CatalogRecRow): ProductGridItem | null {
  if (!row?.id || !row?.slug) return null;
  const priceValue = parsePrice(row.price);
  const priceLabel = formatPrice(priceValue, row.currency);
  const image = normalizeImageUrl(row.thumbnail_url ?? null) ?? undefined;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title ?? row.slug,
    subtitle: row.description ?? undefined,
    price: priceLabel ?? undefined,
    meta: buildMeta(row),
    image,
  } satisfies ProductGridItem;
}

function sanitizeUuidList(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === "string" && UUID_PATTERN.test(value))),
  );
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function computePriceSimilarity(price: number | null, avgPrice: number | null): number {
  if (price == null || avgPrice == null || avgPrice <= 0) return 0.5;
  const distance = Math.abs(price - avgPrice) / Math.max(avgPrice, 1);
  return clamp01(1 - Math.min(distance, 1));
}

function resolveAnonForRecs(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const aid = cookieStore.get(AID_COOKIE_NAME)?.value ?? null;
  const legacy = cookieStore.get(LEGACY_ANON_COOKIE_NAME)?.value ?? null;
  const candidate = aid ?? legacy ?? null;

  if (!candidate || !UUID_PATTERN.test(candidate)) {
    const anonId = crypto.randomUUID();
    return { actor: anonId, setAid: true, setLegacy: true };
  }

  return { actor: candidate, setAid: !aid, setLegacy: !legacy };
}

function withAnonCookies(
  response: ReturnType<typeof json>,
  actor: string,
  setAid: boolean,
  setLegacy: boolean,
) {
  if (setAid) {
    response.cookies.set({
      name: AID_COOKIE_NAME,
      value: actor,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: ANON_COOKIE_MAX_AGE,
    });
  }
  if (setLegacy) {
    response.cookies.set({
      name: LEGACY_ANON_COOKIE_NAME,
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

function resolveTrendingReason(row: CatalogRecRow): string {
  const category = normalizeText(row.category_title);
  if (category) return `Trending in ${category}`;
  const brand = normalizeText(row.brand_name);
  if (brand) return `Popular in ${brand}`;
  return "Trending now";
}

function resolveReasonLabel(
  row: CatalogRecRow,
  sources: Set<string>,
  catAffinity: number,
  brandAffinity: number,
): string | null {
  const category = normalizeText(row.category_title);
  const brand = normalizeText(row.brand_name);

  if (catAffinity > 0 && catAffinity >= brandAffinity && category) {
    return `Because you viewed ${category}`;
  }
  if (brandAffinity > 0 && brand) {
    return `Popular in ${brand}`;
  }
  if (sources.has("trending")) {
    return resolveTrendingReason(row);
  }
  return null;
}

function buildTrendingItems(trendingRows: CatalogRecRow[], limit: number): ApiRecItem[] {
  const maxViews = Math.max(
    1,
    ...trendingRows.map((row) => Number(row?.views_total ?? 0)).filter((value) => Number.isFinite(value)),
  );
  const items: ApiRecItem[] = [];
  for (const row of trendingRows) {
    if (items.length >= limit) break;
    if (!row?.id || !row?.slug) continue;
    if (normalizeStatus(row.status) !== PUBLISHED_STATUS) continue;
    const base = mapRowToGridItem(row);
    if (!base) continue;
    const popularity = clamp01(Number(row.views_total ?? 0) / maxViews);
    const reason = items.length < MAX_REASON_ITEMS ? resolveTrendingReason(row) : null;
    items.push({
      ...base,
      score: popularity,
      reason,
      category_id: row.category_id ?? null,
      category_slug: row.category_slug ?? null,
      category_title: row.category_title ?? null,
      brand_id: row.brand_id ?? null,
      brand_slug: row.brand_slug ?? null,
      brand_name: row.brand_name ?? null,
      views_total: Number(row.views_total ?? 0),
    });
  }
  return items;
}

export async function POST(request: Request) {
  const supabase = getAdminClient();
  const { actor, shouldSetAnonCookie } = await resolveActorForLegacy();

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("opt_out")
    .eq("anon_id", actor)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }

  if (profile?.opt_out) {
    const response = NextResponse.json({ ok: false, opt_out: true }, { status: 403 });
    return withLegacyAnonCookie(response, actor, shouldSetAnonCookie);
  }

  const payload = (await request.json().catch(() => null)) as any;
  const eventRaw = typeof payload?.event === "string" ? payload.event.toLowerCase().trim() : "";
  if (!ALLOWED_EVENTS.has(eventRaw)) {
    return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
  }

  const productId = normalizeText(payload?.productId);
  const category = normalizeText(payload?.category);
  const priceCents = parseNumber(payload?.priceCents);
  const weightParsed = parseNumber(payload?.weight);
  const weight = weightParsed != null && weightParsed > 0 ? weightParsed : 1;
  const metadata = payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : null;

  const { error } = await supabase.from("user_events").insert({
    anon_id: actor,
    event: eventRaw,
    product_id: productId,
    category,
    price_cents: priceCents != null ? Math.round(priceCents) : null,
    weight,
    metadata,
  });

  const response = NextResponse.json({ ok: !error, error: error?.message });
  return withLegacyAnonCookie(response, actor, shouldSetAnonCookie);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = clampLimit(url.searchParams.get("limit"), DEFAULT_LIMIT);
  const debugEnabled = url.searchParams.get("debug") === "1";

  const cookieStore = await cookies();
  const { actor, setAid, setLegacy } = resolveAnonForRecs(cookieStore);

  const supabase = getAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("opt_out")
    .eq("anon_id", actor)
    .maybeSingle();

  if (profileError) {
    return withAnonCookies(
      json({ ok: false, error: profileError.message }, 500),
      actor,
      setAid,
      setLegacy,
    );
  }

  if (profile?.opt_out) {
    const response = json(
      {
        ok: true,
        opt_out: true,
        personalization: { enabled: false, topCats: [], topBrands: [] },
        items: [],
        recommendations: [],
      },
      200,
    );
    return withAnonCookies(response, actor, setAid, setLegacy);
  }

  const trendingPromise = supabase
    .from(CATALOG_VIEW)
    .select(SELECT_COLUMNS)
    .eq("status", PUBLISHED_STATUS)
    .order("views_total", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(TRENDING_POOL);

  const { data: events, error: eventsError } = await supabase
    .from("catalog_events_v")
    .select("product_id, created_at")
    .eq("anon_id", actor)
    .eq("event_type", "view_product")
    .not("product_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (eventsError) {
    console.warn?.("[recs] events query failed", { message: eventsError.message });
  }

  const trendingRes = await trendingPromise;
  if (trendingRes.error) {
    return withAnonCookies(
      json({ ok: false, error: trendingRes.error.message }, 500),
      actor,
      setAid,
      setLegacy,
    );
  }

  const trendingRows = (trendingRes.data as CatalogRecRow[] | null) ?? [];
  const viewedIds = sanitizeUuidList((events as EventRow[] | null)?.map((row) => row.product_id) ?? []);

  if (!viewedIds.length) {
    const items = buildTrendingItems(trendingRows, limit);

    const response = json(
      {
        ok: true,
        personalization: { enabled: false, topCats: [], topBrands: [] },
        items,
        recommendations: items,
      },
      200,
    );
    return withAnonCookies(response, actor, setAid, setLegacy);
  }

  const { data: viewedMeta, error: viewedError } = await supabase
    .from(CATALOG_VIEW)
    .select("id, category_id, category_slug, category_title, brand_id, brand_slug, brand_name, price")
    .in("id", viewedIds);

  if (viewedError) {
    console.warn?.("[recs] meta lookup failed", { message: viewedError.message });
    const items = buildTrendingItems(trendingRows, limit);
    const response = json(
      {
        ok: true,
        personalization: { enabled: false, topCats: [], topBrands: [] },
        items,
        recommendations: items,
      },
      200,
    );
    return withAnonCookies(response, actor, setAid, setLegacy);
  }

  const viewedMap = new Map<string, CatalogRecRow>();
  for (const row of (viewedMeta as CatalogRecRow[] | null) ?? []) {
    if (row?.id) viewedMap.set(row.id, row);
  }

  const catCounts = new Map<string, { count: number; slug?: string | null; title?: string | null }>();
  const brandCounts = new Map<string, { count: number; slug?: string | null; name?: string | null }>();
  const priceSamples: number[] = [];

  for (const row of (events as EventRow[] | null) ?? []) {
    const productId = row?.product_id;
    if (!productId || !UUID_PATTERN.test(productId)) continue;
    const meta = viewedMap.get(productId);
    if (!meta) continue;

    if (meta.category_id) {
      const entry = catCounts.get(meta.category_id) ?? {
        count: 0,
        slug: meta.category_slug ?? null,
        title: meta.category_title ?? null,
      };
      entry.count += 1;
      if (!entry.slug) entry.slug = meta.category_slug ?? null;
      if (!entry.title) entry.title = meta.category_title ?? null;
      catCounts.set(meta.category_id, entry);
    }

    if (meta.brand_id) {
      const entry = brandCounts.get(meta.brand_id) ?? {
        count: 0,
        slug: meta.brand_slug ?? null,
        name: meta.brand_name ?? null,
      };
      entry.count += 1;
      if (!entry.slug) entry.slug = meta.brand_slug ?? null;
      if (!entry.name) entry.name = meta.brand_name ?? null;
      brandCounts.set(meta.brand_id, entry);
    }

    const priceValue = parsePrice(meta.price);
    if (priceValue != null) priceSamples.push(priceValue);
  }

  const topCats: AffinityEntry[] = Array.from(catCounts.entries())
    .map(([id, entry]) => ({ id, slug: entry.slug ?? null, title: entry.title ?? null, count: entry.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const topBrands: BrandEntry[] = Array.from(brandCounts.entries())
    .map(([id, entry]) => ({ id, slug: entry.slug ?? null, name: entry.name ?? null, count: entry.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);

  const avgPrice = priceSamples.length
    ? priceSamples.reduce((sum, value) => sum + value, 0) / priceSamples.length
    : null;

  const categoryIds = topCats.map((entry) => entry.id);
  const brandIds = topBrands.map((entry) => entry.id);

  const candidateMap = new Map<string, { row: CatalogRecRow; sources: Set<string> }>();
  const addCandidates = (rows: CatalogRecRow[] | null, source: string) => {
    for (const row of rows ?? []) {
      if (!row?.id) continue;
      const existing = candidateMap.get(row.id);
      if (existing) {
        existing.sources.add(source);
      } else {
        candidateMap.set(row.id, { row, sources: new Set([source]) });
      }
    }
  };

  addCandidates(trendingRows, "trending");

  if (categoryIds.length) {
    const { data: categoryRows, error: categoryError } = await supabase
      .from(CATALOG_VIEW)
      .select(SELECT_COLUMNS)
      .eq("status", PUBLISHED_STATUS)
      .in("category_id", categoryIds)
      .order("views_total", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(TRENDING_POOL);
    if (categoryError) {
      console.warn?.("[recs] category candidates failed", { message: categoryError.message });
    } else {
      addCandidates(categoryRows as CatalogRecRow[] | null, "category");
    }
  }

  if (brandIds.length) {
    const { data: brandRows, error: brandError } = await supabase
      .from(CATALOG_VIEW)
      .select(SELECT_COLUMNS)
      .eq("status", PUBLISHED_STATUS)
      .in("brand_id", brandIds)
      .order("views_total", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(TRENDING_POOL);
    if (brandError) {
      console.warn?.("[recs] brand candidates failed", { message: brandError.message });
    } else {
      addCandidates(brandRows as CatalogRecRow[] | null, "brand");
    }
  }

  const candidateRows = Array.from(candidateMap.values())
    .map((entry) => ({ row: entry.row, sources: entry.sources }))
    .filter((entry) => entry.row?.id && entry.row?.slug)
    .filter((entry) => normalizeStatus(entry.row.status) === PUBLISHED_STATUS)
    .filter((entry) => !viewedIds.includes(entry.row.id));

  const maxViews = Math.max(
    1,
    ...candidateRows
      .map((entry) => Number(entry.row.views_total ?? 0))
      .filter((value) => Number.isFinite(value)),
  );

  const maxCatCount = topCats[0]?.count ?? 0;
  const maxBrandCount = topBrands[0]?.count ?? 0;

  const scored: ScoredCandidate[] = candidateRows.map(({ row, sources }) => {
    const catCount = row.category_id ? catCounts.get(row.category_id)?.count ?? 0 : 0;
    const brandCount = row.brand_id ? brandCounts.get(row.brand_id)?.count ?? 0 : 0;

    const catAffinity = maxCatCount > 0 ? clamp01(catCount / maxCatCount) : 0;
    const brandAffinity = maxBrandCount > 0 ? clamp01(brandCount / maxBrandCount) : 0;
    const priceSimilarity = computePriceSimilarity(parsePrice(row.price), avgPrice);
    const popularity = maxViews > 0 ? clamp01(Number(row.views_total ?? 0) / maxViews) : 0;

    const score =
      0.45 * catAffinity + 0.25 * brandAffinity + 0.15 * priceSimilarity + 0.15 * popularity;

    return {
      row,
      sources,
      score: Number(score.toFixed(4)),
      breakdown: {
        catAffinity,
        brandAffinity,
        priceSimilarity,
        popularity,
      },
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const viewsA = Number(a.row.views_total ?? 0);
    const viewsB = Number(b.row.views_total ?? 0);
    if (viewsB !== viewsA) return viewsB - viewsA;
    const createdA = a.row.created_at ? Date.parse(a.row.created_at) : 0;
    const createdB = b.row.created_at ? Date.parse(b.row.created_at) : 0;
    return createdB - createdA;
  });

  const finalItems: ApiRecItem[] = [];
  const brandCap = new Map<string, number>();
  const debugMap = new Map<string, { breakdown: ScoredCandidate["breakdown"]; sources: string[] }>();

  for (const candidate of scored) {
    if (finalItems.length >= limit) break;
    const row = candidate.row;
    const brandId = row.brand_id ?? null;
    if (brandId) {
      const count = brandCap.get(brandId) ?? 0;
      if (count >= 2) continue;
      brandCap.set(brandId, count + 1);
    }

    const base = mapRowToGridItem(row);
    if (!base) continue;
    const reason =
      finalItems.length < MAX_REASON_ITEMS
        ? resolveReasonLabel(
            row,
            candidate.sources,
            candidate.breakdown.catAffinity,
            candidate.breakdown.brandAffinity,
          )
        : null;
    finalItems.push({
      ...base,
      score: candidate.score,
      reason,
      category_id: row.category_id ?? null,
      category_slug: row.category_slug ?? null,
      category_title: row.category_title ?? null,
      brand_id: row.brand_id ?? null,
      brand_slug: row.brand_slug ?? null,
      brand_name: row.brand_name ?? null,
      views_total: Number(row.views_total ?? 0),
    });

    if (row.id) {
      debugMap.set(row.id, {
        breakdown: candidate.breakdown,
        sources: Array.from(candidate.sources),
      });
    }
  }

  if (finalItems.length >= 1) {
    const top = finalItems[0];
    const secondScore = finalItems[1]?.score ?? 0;
    if (top.score >= 0.72 && top.score - secondScore >= 0.08) {
      top.is_featured = true;
    }
  }

  const resolvedItems = finalItems.length ? finalItems : buildTrendingItems(trendingRows, limit);

  const debugPayload = debugEnabled
    ? {
        scores: resolvedItems.slice(0, 5).map((item) => ({
          id: item.id,
          slug: item.slug,
          score: item.score,
          reason: item.reason,
          views_total: item.views_total ?? 0,
          sources: debugMap.get(item.id)?.sources ?? [],
          ...debugMap.get(item.id)?.breakdown,
        })),
        avgPrice,
      }
    : undefined;

  const response = json(
    {
      ok: true,
      personalization: {
        enabled: true,
        topCats,
        topBrands,
      },
      items: resolvedItems,
      recommendations: resolvedItems,
      ...(debugPayload ? { debug: debugPayload } : null),
    },
    200,
  );

  return withAnonCookies(response, actor, setAid, setLegacy);
}
