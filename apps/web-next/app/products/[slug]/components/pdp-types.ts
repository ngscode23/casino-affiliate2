import type { ProductGridItem } from "@/components/ProductGrid";

import type { ProductData, ProductVariantGroup, ProductVariantOption } from "../data";

export type AdminStats = {
  isAdmin: boolean;
  clicks: number;
  impressions: number;
};

export type Breadcrumb = { name: string; href: string };

export type SelectionState = Record<string, ProductVariantOption | undefined>;

export type ReviewBucketScore = 5 | 4 | 3 | 2 | 1;

export type ReviewBucket = { score: ReviewBucketScore; count: number; percent: number };

export type PdpSimilarProps = { items: ProductGridItem[] };
