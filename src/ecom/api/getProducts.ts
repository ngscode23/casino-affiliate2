import type { Product } from "@/ecom/lib/types";
import { api } from "./client";

type DbProduct = {
  id: string;
  slug: string;
  title: string;
  price: number;
  rating: number;
  images: string[] | any;
  short_desc?: string | null;
  category_slug?: string | null;
  tags?: string[] | null;
  specs?: Record<string, string> | null;
};

type ProductsResponse = { items: DbProduct[]; page: number; limit: number; total: number };

function map(p: DbProduct): Product {
  const images = Array.isArray(p.images) ? (p.images as any[]).map(String) : [];
  const tags = Array.isArray(p.tags) ? p.tags : undefined;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    price: Number(p.price),
    rating: Number(p.rating) || 0,
    images,
    category: p.category_slug || "",
    tags,
    shortDesc: p.short_desc || "",
    specs: (p.specs as any) || undefined,
  };
}

export type ProductQuery = Partial<{
  q: string;
  category: string;
  min: number;
  max: number;
  sort: "rating" | "price" | "title" | "created_at";
  dir: "asc" | "desc";
  page: number;
  limit: number;
}>;

export async function getProducts(params: ProductQuery): Promise<{ items: Product[]; total: number }>{
  const data = await api.get<ProductsResponse>("/ecom-products", params as any);
  return { items: data.items.map(map), total: data.total };
}

export default getProducts;

