// ecom/api/client.ts
// Note: use the shared Supabase client for direct DB/RPC calls.
import { supabase } from "@/lib/supabase";


export const API_BASE = "/.netlify/functions";
async function get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(API_BASE + path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`API ${path} ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Список товаров из public.products
 * Фильтры: q (по title), category (slug)
 * Сортировки: rating_desc | price_asc | price_desc
 * Пагинация: limit/offset
 */
export async function listProducts(params: {
  q?: string;
  category?: string;
  sort?: "rating_desc" | "price_asc" | "price_desc";
  limit?: number;
  offset?: number;
}) {
  const { q, category, sort = "rating_desc", limit = 20, offset = 0 } = params;

  // базовый селект; public.products уже безопасная вьюха
  let query = supabase.from("products").select("*", { count: "exact" });

  // фильтр по категории (slug)
  if (category && category.trim()) {
    query = query.eq("slug", category.trim());
  }

  // поиск. Надёжно ищем по title через ILIKE.
  // Если добавишь description в вьюху — можешь заменить на .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  if (q && q.trim()) {
    const needle = `%${q.trim()}%`;
    query = query.ilike("title", needle);
  }

  // сортировки
  if (sort === "rating_desc") {
    // сперва по рейтингу, потом по количеству отзывов
    query = query.order("rating", { ascending: false }).order("rating_count", { ascending: false });
  } else if (sort === "price_asc") {
    query = query.order("price", { ascending: true });
  } else if (sort === "price_desc") {
    query = query.order("price", { ascending: false });
  }

  // пагинация
  const from = offset;
  const to = offset + (limit ?? 20) - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return { items: data ?? [], total: count ?? 0 };
}

// отправка отзыва через RPC (остаётся как было)
export async function addReview(p: { productId: number; rating: number; title: string; body: string }) {
  return supabase.rpc("add_product_review", {
    p_product_id: p.productId,
    p_rating: p.rating,
    p_title: p.title,
    p_body: p.body,
  });
}

export const api = { get };
export default api;

// Fetch single product by slug from server (returns DB uuid id)
export async function getProductBySlug(slug: string): Promise<{ id: string } | null> {
  const url = new URL(API_BASE + "/ecom-product", window.location.origin);
  url.searchParams.set("slug", slug);
  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  const id = data?.item?.id;
  return typeof id === "string" ? { id } : null;
}

export async function listProductReviews(productId: string) {
  const url = new URL(API_BASE + "/reviews/list", window.location.origin);
  url.searchParams.set("product_id", productId);
  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (!res.ok) return [] as Array<{ user_id: string; rating: number; title: string; body: string; created_at: string }>;
  const data = await res.json();
  return (data?.items ?? []) as Array<{ user_id: string; rating: number; title: string; body: string; created_at: string }>;
}
