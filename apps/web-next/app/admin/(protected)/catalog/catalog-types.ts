import type { ProductTechSpecs } from "@/lib/catalog/product-tech-specs";

export type CatalogBrandRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  website: string | null;
  created_at: string | null;
  status?: string | null;
  is_active?: boolean | null;
};

export type CatalogProductStatus = "draft" | "published" | "archived";

export type CatalogProductRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  status: CatalogProductStatus;
  brand_id: string | null;
  created_at: string | null;
  specs: ProductTechSpecs | null;
};
