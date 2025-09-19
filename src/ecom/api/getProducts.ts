import type { Product } from "@/ecom/lib/types";
import { api } from "./client";
import localProducts from "@/ecom/data/products";

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
  try {
    const data = await api.get<ProductsResponse>("/ecom-products", params as any);
    return { items: data.items.map(map), total: data.total };
  } catch  {
   
    // Fallback for local dev without Netlify functions: filter in-memory dataset
    let items = [...localProducts] as Product[];
    const q = (params.q || "").trim().toLowerCase();
    const category = (params.category || "").trim().toLowerCase();
    const min = Number(params.min);
    const max = Number(params.max);
    const sort = params.sort || "rating";
    const dir = params.dir === "asc" ? 1 : -1;

    if (q) {
      items = items.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.shortDesc || "").toLowerCase().includes(q) ||
        (p.tags || []).some(t => (t || "").toLowerCase().includes(q))
      );
    }
    if (category && category !== "all") items = items.filter(p => (p.category || "").toLowerCase() === category);
    if (Number.isFinite(min)) items = items.filter(p => p.price >= (min || 0));
    if (Number.isFinite(max) && max) items = items.filter(p => p.price <= max);

    items.sort((a, b) => {
      const by = sort as any;
      const av = (a as any)[by];
      const bv = (b as any)[by];
      if (av < bv) return -1 * dir; if (av > bv) return 1 * dir; return 0;
    });

    const total = items.length;
    const limit = Math.max(1, Math.min(200, Number(params.limit || 60)));
    const page = Math.max(1, Number(params.page || 1));
    const from = (page - 1) * limit;
    const to = from + limit;
    items = items.slice(from, to);

    return { items, total };
  }
}

export default getProducts;

