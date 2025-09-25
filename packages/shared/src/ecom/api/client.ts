// ecom/api/client.ts
// Note: use the shared Supabase client for direct DB/RPC calls.
import { supabase } from "@shared/lib/supabase";
import { getValidAccessToken } from "@shared/lib/auth";
// Re-export supabase instance for consumers under ecom namespace
export { supabase };




export const API_BASE = "/api";
const API_FALLBACK = "/.netlify/functions";
export const API_FALLBACK_BASE = API_FALLBACK;
const API_BASES = Array.from(new Set([API_BASE, API_FALLBACK]));

async function apiRequest(
  path: string,
  init: RequestInit = {},
  params?: Record<string, any>
): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let i = 0; i < API_BASES.length; i += 1) {
    const base = API_BASES[i];
    const url = new URL(base + path, window.location.origin);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }
    const res = await fetch(url.toString(), init);
    if (res.status === 404 && i < API_BASES.length - 1) {
      lastResponse = res;
      continue;
    }
    return res;
  }
  if (lastResponse) return lastResponse;
  throw new Error("API request failed");
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = { accept: "application/json", "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}
async function get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
  const res = await apiRequest(path, { headers: { accept: "application/json" } }, params);
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

// отправка отзыва через Netlify endpoint
export async function addReview(p: { productId: string | number; rating: number; title: string; body: string }) {
  const headers = await authHeaders();
  if (!('authorization' in headers)) throw new Error('Not authenticated');
  const res = await apiRequest('/reviews/add', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      product_id: String(p.productId),
      rating: p.rating,
      title: p.title,
      body: p.body,
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    try {
      const data = JSON.parse(raw || 'null');
      throw new Error(String(data?.message || data?.code || res.status));
    } catch {
      throw new Error(raw || `reviews/add ${res.status}`);
    }
  }
  return true;
}

export const api = { get };
export default api;

// Fetch single product by slug from server (returns DB uuid id)
import type { Product } from "@shared/ecom/lib/types";

function mapDbToProduct(p: any): Product {
  const images = Array.isArray(p?.images) ? p.images.map(String) : [];
  return {
    id: String(p.id),
    slug: String(p.slug),
    title: String(p.title ?? ""),
    price: Number(p.price ?? 0),
    rating: Number(p.rating ?? 0),
    images,
    category: String(p.category_slug ?? ""),
    tags: Array.isArray(p?.tags) ? (p.tags as string[]) : undefined,
    shortDesc: String(p.short_desc ?? ""),
    specs: (p.specs as Record<string, string>) || undefined,
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const res = await apiRequest("/ecom-product", { headers: { accept: "application/json" } }, { slug });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.item) return null;
  return mapDbToProduct(data.item);
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const res = await apiRequest(
    "/ecom-products",
    { headers: { accept: "application/json" } },
    { ids: ids.join(","), limit: ids.length }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map(mapDbToProduct);
}

export async function listProductReviews(productId: string) {
  const res = await apiRequest("/reviews/list", { headers: { accept: "application/json" } }, { product_id: productId });
  if (!res.ok) return [] as Array<{ user_id: string; rating: number; title: string; body: string; created_at: string }>;
  const data = await res.json();
  return (data?.items ?? []) as Array<{ user_id: string; rating: number; title: string; body: string; created_at: string }>;
}

export type PlaceOrderContact = {
  fullName?: string;
  email?: string;
};

export type PlaceOrderShipping = {
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string | null;
};

export type PlaceOrderCheckout = {
  contact?: PlaceOrderContact;
  shipping?: PlaceOrderShipping;
};

export type PlaceOrderOptions = {
  currency?: string;
  checkout?: PlaceOrderCheckout;
};

function normalizeCheckoutString(value: unknown, max = 512): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > max) return trimmed.slice(0, max);
  return trimmed;
}
// Create an order for current authenticated user via Netlify function
export async function placeOrder(
  items: Array<{ id: string; qty: number }>,
  optionsOrCurrency?: string | PlaceOrderOptions
): Promise<{ order_id: string }> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Not authenticated");

  let currency: string | undefined;
  let checkout: PlaceOrderCheckout | undefined;
  if (typeof optionsOrCurrency === "string") {
    currency = optionsOrCurrency;
  } else if (optionsOrCurrency) {
    currency = optionsOrCurrency.currency;
    checkout = optionsOrCurrency.checkout;
  }

  const checkoutPayload = (() => {
    if (!checkout) return undefined;
    const contactRaw = checkout.contact || {};
    const shippingRaw = checkout.shipping || {};
    const contact = {
      ...(normalizeCheckoutString(contactRaw.fullName, 160)
        ? { fullName: normalizeCheckoutString(contactRaw.fullName, 160)! }
        : {}),
      ...(normalizeCheckoutString(contactRaw.email, 254)
        ? { email: normalizeCheckoutString(contactRaw.email, 254)! }
        : {}),
    };
    const shipping = {
      ...(normalizeCheckoutString(shippingRaw.address)
        ? { address: normalizeCheckoutString(shippingRaw.address)! }
        : {}),
      ...(normalizeCheckoutString(shippingRaw.city)
        ? { city: normalizeCheckoutString(shippingRaw.city)! }
        : {}),
      ...(normalizeCheckoutString(shippingRaw.postalCode, 40)
        ? { postalCode: normalizeCheckoutString(shippingRaw.postalCode, 40)! }
        : {}),
      ...(normalizeCheckoutString(shippingRaw.notes, 500)
        ? { notes: normalizeCheckoutString(shippingRaw.notes, 500)! }
        : {}),
    };
    const hasContact = Object.keys(contact).length > 0;
    const hasShipping = Object.keys(shipping).length > 0;
    if (!hasContact && !hasShipping) return undefined;
    return {
      ...(hasContact ? { contact } : {}),
      ...(hasShipping ? { shipping } : {}),
    } as PlaceOrderCheckout;
  })();

  const payload: Record<string, unknown> = { items };
  if (currency) payload.currency = currency;
  if (checkoutPayload) payload.checkout = checkoutPayload;

  const res = await apiRequest("/orders-create", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  let data: any = null;
  try { data = JSON.parse(raw || "null"); } catch { /* keep raw */ }
  if (!res.ok) {
    const msg = (data && (data.message || data.code)) || raw || `orders-create ${res.status}`;
    throw new Error(String(msg));
  }
  if (!data || data.ok === false || !data.order_id) {
    const msg = (data && (data.message || data.code)) || "order_failed";
    throw new Error(String(msg));
  }
  return { order_id: String(data.order_id) };
}
export type OrderListItem = {
  id: string;
  created_at: string;
  amount_total: number;
  currency: string;
  status: string;
  payment_status?: string | null;
};

export async function listOrders(params: {
  status?: string;
  from?: string;
  to?: string;
  q?: string;
  sort?: string; // "created_at desc" | "amount_total asc" etc.
  page?: number;
  page_size?: number;
} = {}) {
  const headers = await authHeaders();
  // Ensure user is authenticated
  if (!('authorization' in headers)) throw new Error("Not authenticated");
  const res = await apiRequest("/orders", { headers }, params);
  const raw = await res.text();
  let data: any = null;
  try { data = JSON.parse(raw || "null"); } catch {}
  if (!res.ok) throw new Error(String((data && (data.message || data.code)) || raw || res.status));
  return {
    items: (Array.isArray(data?.items) ? data.items : []) as OrderListItem[],
    count: Number(data?.count ?? 0),
    page: Number(data?.page ?? 1),
    page_size: Number(data?.page_size ?? (params.page_size || 20)),
  };
}

export async function getOrder(id: string): Promise<{
  order: {
    id: string;
    created_at: string;
    amount_subtotal: number;
    amount_discounts: number;
    amount_tax: number;
    amount_total: number;
    currency: string;
    status: string;
    payment_status?: string | null;
  };
  items: Array<{ id: string; product_id: string; title: string; qty: number; unit_price: number; total: number }>;
  payment?: { id: string; status: string; amount: number; currency: string; provider: string; provider_ref?: string; created_at: string } | null;
}> {
  const headers = await authHeaders();
  if (!('authorization' in headers)) throw new Error("Not authenticated");
  const res = await apiRequest(`/orders/${encodeURIComponent(id)}`, { headers });
  const raw = await res.text();
  let data: any = null;
  try { data = JSON.parse(raw || "null"); } catch {}
  if (!res.ok) throw new Error(String((data && (data.message || data.code)) || raw || res.status));
  return { order: data.order, items: data.items || [], payment: data.payment || null };
}

export async function cancelOrder(id: string) {
  const headers = await authHeaders();
  if (!('authorization' in headers)) throw new Error("Not authenticated");
  const res = await apiRequest(`/orders/${encodeURIComponent(id)}/cancel`, { method: "POST", headers });
  const raw = await res.text();
  let data: any = null;
  try { data = JSON.parse(raw || "null"); } catch {}
  if (!res.ok) throw new Error(String((data && (data.message || data.code)) || raw || res.status));
  return true;
}

export async function confirmPayment(id: string, scenario?: "authorized" | "requires_action" | "failed" | "succeeded") {
  const headers = await authHeaders();
  if (!('authorization' in headers)) throw new Error("Not authenticated");
  const res = await apiRequest(
    `/orders/${encodeURIComponent(id)}/confirm-payment`,
    { method: "POST", headers },
    scenario ? { scenario } : undefined
  );
  const raw = await res.text();
  let data: any = null;
  try { data = JSON.parse(raw || "null"); } catch {}
  if (!res.ok) throw new Error(String((data && (data.message || data.code)) || raw || res.status));
  return data as { ok: boolean; status: string; next_action?: any };
}

