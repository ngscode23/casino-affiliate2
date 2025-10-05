import type { Product } from "@shared/ecom/lib/types";
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

type ProductResponse = { item: DbProduct };

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

export async function getProduct(slug: string): Promise<Product | null> {
  const data = await api.get<ProductResponse>("/ecom-product", { slug });
  return data?.item ? map(data.item) : null;
}

export default getProduct;


