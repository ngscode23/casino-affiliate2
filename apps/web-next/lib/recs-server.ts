import { getAdminClient } from "@/utils/supabase/admin";
import { normalizeImageUrl } from "@/app/products/[slug]/data";

const DEFAULT_EXPLORE_ROLLOUT = 0.2;
const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

type FeatureFlagRow = {
  enabled: boolean | null;
  rollout?: number | null;
  metadata?: Record<string, unknown> | null;
};

type RpcRec = { product_id: string | null; reason: string | null; score: number | null };

type SupabaseClient = ReturnType<typeof getAdminClient>;

export type RecProduct = {
  id: string;
  slug: string;
  title: string;
  meta: string | null;
  price: string | null;
  price_cents: number | null;
  rating: number;
  image?: string | null;
  category: string | null;
};

export type RecItem = {
  product_id: string | null;
  reason: string | null;
  score: number | null;
  adjusted_score: number | null;
  treatment: "control" | "explore" | "fallback";
  rank: number;
  bandit: { from_rank: number | null; rollout: number | null } | null;
  product: RecProduct | null;
};

export type RecommendationResult = {
  actor: string;
  treatment: "control" | "explore" | "fallback";
  items: RecItem[];
  error?: string | null;
};

export type RecommendationParams = {
  actor: string;
  limit?: number;
  category?: string | null;
  query?: string | null;
  supabaseClient?: SupabaseClient;
};

function parseNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function formatPrice(value: number | null | undefined, currency: string | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const code = currency && typeof currency === "string" && currency.trim().length === 3 ? currency : "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

async function fetchExploreFlag(supabase: SupabaseClient) {
  try {
    const { data } = await supabase
      .from("feature_flags")
      .select("enabled, rollout, metadata")
      .eq("key", "recs_explore")
      .limit(1)
      .maybeSingle<FeatureFlagRow>();

    const enabled = Boolean(data?.enabled);
    const rolloutCandidate =
      parseNumber(data?.rollout) ?? parseNumber((data?.metadata as Record<string, unknown> | null)?.rollout);
    const rollout =
      rolloutCandidate != null && rolloutCandidate >= 0 && rolloutCandidate <= 1
        ? rolloutCandidate
        : DEFAULT_EXPLORE_ROLLOUT;
    return { enabled, rollout };
  } catch {
    return { enabled: false, rollout: 0 };
  }
}

function applyBanditVariant(items: RpcRec[], rollout: number) {
  if (!items.length || rollout <= 0) {
    return { variant: "control" as const, banditFrom: null as number | null, recs: items };
  }
  const shouldExplore = Math.random() < rollout && items.length > 1;
  if (!shouldExplore) {
    return { variant: "control" as const, banditFrom: null as number | null, recs: items };
  }

  const maxIndex = Math.min(5, items.length) - 1;
  const pickIndex = Math.max(1, Math.floor(Math.random() * (maxIndex + 1)));
  const next = [...items];
  const [picked] = next.splice(pickIndex, 1);
  next.unshift(picked);

  return {
    variant: "explore" as const,
    banditFrom: pickIndex + 1, // 1-based rank before swap
    recs: next,
  };
}

async function fetchProductsByIds(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return { data: [], error: null };
  return supabase
    .from("ecom_products")
    .select(
      "id, slug, title, short_desc, description, price, price_cents, rating, main_image_url, image_path, images, currency, category_slug, status, deleted_at",
    )
    .in("id", ids)
    .in("status", ["active", "published"])
    .is("deleted_at", null);
}

function buildRecProduct(product: any): RecProduct {
  const priceCentsRaw =
    product?.price_cents != null
      ? parseNumber(product.price_cents)
      : null;
  const priceCents =
    priceCentsRaw != null
      ? priceCentsRaw
      : product?.price != null && Number.isFinite(Number(product.price))
        ? Math.round(Number(product.price) * 100)
        : null;
  const price = priceCents != null ? Math.max(0, priceCents) / 100 : null;
  const rating = parseNumber(product?.rating) ?? 0;
  const image =
    normalizeImageUrl(product?.main_image_url ?? null) ||
    normalizeImageUrl(product?.image_path ?? null) ||
    (Array.isArray(product?.images)
      ? normalizeImageUrl(
          (() => {
            const first = product.images.find((x: unknown) => typeof x === "string" && x.trim());
            return first ?? null;
          })(),
        )
      : null);

  return {
    id: product.id,
    slug: product.slug ?? "",
    title: product.title ?? "",
    meta: product.short_desc ?? product.description ?? null,
    price: price != null ? formatPrice(price, product.currency) : null,
    price_cents: priceCents ?? null,
    rating,
    image,
    category: product.category_slug ?? null,
  };
}

async function fetchFallback(supabase: SupabaseClient, limit: number): Promise<RecommendationResult> {
  const fallback = await supabase
    .from("ecom_products")
    .select(
      "id, slug, title, description, short_desc, price, price_cents, rating, main_image_url, image_path, images, currency, category_slug, status, deleted_at",
    )
    .in("status", ["active", "published"])
    .is("deleted_at", null)
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(limit);

  const products = Array.isArray(fallback.data) ? fallback.data : [];
  const items: RecItem[] = products.map((product, index) => {
    const recProduct = buildRecProduct(product);
    const rating = recProduct.rating ?? 0;
    return {
      product_id: recProduct.id,
      reason: "trending",
      score: rating,
      adjusted_score: rating,
      treatment: "fallback",
      rank: index + 1,
      bandit: null,
      product: recProduct,
    };
  });

  return {
    actor: "",
    treatment: "fallback",
    items,
    error: null,
  };
}

export async function getRecommendationsForActor(params: RecommendationParams): Promise<RecommendationResult> {
  const supabase = params.supabaseClient ?? getAdminClient();
  const actor = params.actor && UUID_PATTERN.test(params.actor) ? params.actor : params.actor;
  const p_limit = Math.min(Math.max(Number(params.limit ?? 12), 1), 50);
  const p_category = normalizeText(params.category);
  const p_query = normalizeText(params.query);

  const { data, error } = await supabase.rpc("get_recs", {
    p_actor: actor,
    p_limit,
    p_category: p_category ?? null,
    p_query: p_query ?? null,
  });

  if (error) {
    const fallback = await fetchFallback(supabase, p_limit);
    return { ...fallback, actor, error: error.message ?? "rpc_failed" };
  }

  const recs: RpcRec[] = Array.isArray(data) ? data : [];
  if (!recs.length) {
    const fallback = await fetchFallback(supabase, p_limit);
    return { ...fallback, actor, error: null };
  }

  const ids = recs
    .map((row) => row?.product_id)
    .filter((id): id is string => typeof id === "string");

  const [flag, productsRes] = await Promise.all([fetchExploreFlag(supabase), fetchProductsByIds(supabase, ids)]);

  const productMap = new Map<string, any>();
  if (!productsRes.error && Array.isArray(productsRes.data)) {
    for (const row of productsRes.data) {
      if (row?.id) {
        productMap.set(String(row.id), row);
      }
    }
  }

  const { variant, banditFrom, recs: banditRecs } = applyBanditVariant(recs, flag.enabled ? flag.rollout : 0);

  const items = banditRecs.slice(0, p_limit).map((rec, index) => {
    const product = rec.product_id ? productMap.get(rec.product_id) : null;
    const recProduct = product ? buildRecProduct(product) : null;
    const rating = recProduct?.rating ?? 0;
    const priceCents = recProduct?.price_cents ?? null;

    const popularityBoost = rating > 0 ? 1 + Math.min(rating / 5, 1) * 0.05 : 1;
    const marginBoost =
      priceCents && priceCents > 0 ? 1 + Math.min(Math.log10(priceCents / 100 + 1) * 0.02, 0.25) : 1;
    const baseScore = parseNumber(rec.score) ?? 0;
    const adjustedScore = Number((baseScore * popularityBoost * marginBoost).toFixed(4));

    return {
      product_id: rec.product_id,
      reason: rec.reason ?? null,
      score: rec.score ?? null,
      adjusted_score: adjustedScore,
      treatment: variant,
      rank: index + 1,
      bandit: variant === "explore" && index === 0 && banditFrom ? { from_rank: banditFrom, rollout: flag.rollout } : null,
      product: recProduct,
    } satisfies RecItem;
  });

  return {
    actor,
    treatment: variant,
    items,
    error: null,
  };
}
