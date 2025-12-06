import type { Product, UserProfile } from "@/types/domain";
import { getAdminClient } from "@/utils/supabase/admin";

export type { UserProfile };

export type PersonalizationContext = {
  profile?: UserProfile | null;
  country?: string;
  device?: string;
  experimentVariant?: string | null;
};

export async function fetchUserProfile(anonId: string): Promise<UserProfile | null> {
  if (!anonId) return null;
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("user_profiles")
      .select(
        "anon_id, first_seen, last_seen, updated_at, visit_count, device_pref, countries, categories, discount_affinity, cold_start, opt_out, experiment_variant",
      )
      .eq("anon_id", anonId)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn?.("[personalization] failed to fetch profile", { message: error.message });
      return null;
    }
    return (data as UserProfile) || null;
  } catch (error) {
    console.warn?.("[personalization] profile fetch threw", { message: (error as Error)?.message ?? String(error) });
    return null;
  }
}

function baseScore(product: Product): number {
  let score = 0;
  if (product.isTop) score += 6;
  if (product.isNew) score += 3;
  if (typeof product.discountPercent === "number" && product.discountPercent > 0) score += 4;
  return score;
}

function categoryScore(product: Product, profile: UserProfile | null | undefined): number {
  const categories = profile?.categories ?? [];
  if (!categories || !product.categorySlug) return 0;
  const idx = categories.findIndex((value) => value === product.categorySlug);
  if (idx === -1) return 0;
  const weight = Math.max(0, 20 - idx * 4);
  return weight;
}

function discountAffinityScore(product: Product, profile: UserProfile | null | undefined): number {
  const affinity = profile?.discount_affinity ?? 0;
  const hasDiscount =
    (typeof product.discountPercent === "number" && product.discountPercent > 0) ||
    (typeof product.discountAmountCents === "number" && product.discountAmountCents > 0);
  if (!hasDiscount) return 0;
  return Math.min(1, Math.max(0, affinity)) * 25;
}

function countryScore(country: string | undefined, profile: UserProfile | null | undefined): number {
  if (!country) return 0;
  const countries = profile?.countries ?? [];
  if (!countries?.length) return 0;
  const idx = countries.findIndex((value) => value && value.toLowerCase() === country.toLowerCase());
  if (idx === -1) return 0;
  return Math.max(0, 10 - idx * 2);
}

function deviceScore(device: string | undefined, profile: UserProfile | null | undefined): number {
  if (!device || !profile?.device_pref) return 0;
  return device === profile.device_pref ? 4 : 0;
}

export function applyPersonalizedRanking(
  products: Product[],
  context: PersonalizationContext = {},
): Product[] {
  const profile = context.profile;
  if (!products.length) return products;
  if (!profile || profile.opt_out) {
    return [...products];
  }

  // Cold start: prioritise curated flags without relying on history
  if (profile.cold_start) {
    return [...products].sort((a, b) => {
      const topDelta = Number(Boolean(b.isTop)) - Number(Boolean(a.isTop));
      if (topDelta !== 0) return topDelta;
      const newDelta = Number(Boolean(b.isNew)) - Number(Boolean(a.isNew));
      if (newDelta !== 0) return newDelta;
      return a.order - b.order;
    });
  }

  const scored = products.map((product, index) => {
    const score =
      baseScore(product) +
      categoryScore(product, profile) +
      discountAffinityScore(product, profile) +
      countryScore(context.country, profile) +
      deviceScore(context.device, profile);

    return { product, score, index };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  return scored.map((item) => item.product);
}
