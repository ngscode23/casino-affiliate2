export type RecMeta = {
  treatment?: string | null;
  rank?: number | null;
  reason?: string | null;
  score?: number | null;
  adjusted_score?: number | null;
  bandit_from?: number | null;
  rollout?: number | null;
  placement?: string | null;
  source?: string | null;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  priceCents?: number | null;
  originalPrice?: number | null;
  originalPriceCents?: number | null;
  discountPercent?: number | null;
  discountAmountCents?: number | null;
  currency: string;
  mainImage: string | null;
  thumbnailPath?: string | null;
  rating: number | null;
  clicks: number;
  impressions: number;
  dataset: "shop" | "legacy";
  order: number;
  createdAt?: string | null;
  isNew?: boolean;
  isTop?: boolean;
  availability: "InStock" | "OutOfStock" | "PreOrder";
  categorySlug: string | null;
  recMeta?: RecMeta;
};
