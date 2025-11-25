import { describe, it, expect } from "vitest";
import { applyPersonalizedRanking, type UserProfile } from "@/lib/personalization/rank";
import type { Product } from "@/app/products/types";

const baseProduct = (overrides: Partial<Product>): Product => ({
  id: "p1",
  slug: "p1",
  title: "P1",
  description: null,
  price: 100,
  priceCents: 10000,
  originalPrice: null,
  originalPriceCents: null,
  discountPercent: null,
  discountAmountCents: null,
  currency: "USD",
  mainImage: null,
  thumbnailPath: null,
  rating: null,
  clicks: 0,
  impressions: 0,
  dataset: "shop",
  order: 0,
  createdAt: null,
  isNew: false,
  isTop: false,
  availability: "InStock",
  categorySlug: null,
  ...overrides,
});

describe("applyPersonalizedRanking", () => {
  it("prioritizes matching categories and country", () => {
    const products = [
      baseProduct({ id: "a", slug: "a", categorySlug: "tech", order: 1 }),
      baseProduct({ id: "b", slug: "b", categorySlug: "home", order: 0 }),
      baseProduct({ id: "c", slug: "c", categorySlug: "other", order: 2 }),
    ];

    const profile: UserProfile = {
      anon_id: "anon",
      categories: ["tech", "home"],
      countries: ["us"],
      discount_affinity: 0.1,
      cold_start: false,
      opt_out: false,
    };

    const ranked = applyPersonalizedRanking(products, {
      profile,
      country: "us",
      device: "desktop",
    });

    expect(ranked[0].id).toBe("a");
    expect(ranked[1].id).toBe("b");
  });

  it("keeps original order when opt-out", () => {
    const products = [
      baseProduct({ id: "x", order: 0 }),
      baseProduct({ id: "y", order: 1 }),
    ];
    const profile: UserProfile = { anon_id: "anon", opt_out: true };
    const ranked = applyPersonalizedRanking(products, { profile });
    expect(ranked.map((p) => p.id)).toEqual(["x", "y"]);
  });

  it("prefers top/new items for cold start", () => {
    const products = [
      baseProduct({ id: "x", order: 1, isTop: true }),
      baseProduct({ id: "y", order: 0, isNew: true }),
      baseProduct({ id: "z", order: 2 }),
    ];
    const profile: UserProfile = { anon_id: "anon", cold_start: true };
    const ranked = applyPersonalizedRanking(products, { profile });
    expect(ranked[0].id).toBe("x");
    expect(ranked[1].id).toBe("y");
  });
});

