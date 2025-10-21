// ecom/api/client.ts
// Note: use the shared Supabase client for direct DB/RPC calls.
import { supabase } from "@shared/lib/supabase";
import { getValidAccessToken } from "@shared/lib/auth";
import { HAS_SUPABASE } from "@shared/config";
import { products as demoProducts } from "@shared/ecom/data/products";
// Re-export supabase instance for consumers under ecom namespace
export { supabase };

const LOCAL_ORDERS_KEY = "ecom:orders";

type LocalOrderItem = { id: string; qty: number; price: number; title: string };
type LocalOrderRecord = {
  id: string;
  createdAt: string;
  currency: string;
  subtotal: number;
  status: string;
  paymentStatus?: string | null;
  checkout?: PlaceOrderCheckout;
  items: LocalOrderItem[];
};

function readLocalOrders(): LocalOrderRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry && typeof entry.id === "string") as LocalOrderRecord[];
  } catch {
    return [];
  }
}

function writeLocalOrders(orders: LocalOrderRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    /* ignore */
  }
}

function generateLocalOrderId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createLocalOrder(items: Array<{ id: string; qty: number }>, currency: string, checkout?: PlaceOrderCheckout) {
  if (typeof window === "undefined") {
    throw new Error("Orders are not available offline in this environment");
  }

  const productMap = new Map(demoProducts.map((item) => [item.id, item]));
  const enriched: LocalOrderItem[] = items
    .filter((row) => row && typeof row.id === "string" && row.qty > 0)
    .map((row) => {
      const product = productMap.get(row.id) || null;
      const price = Number(product?.price ?? 0);
      const title = (product?.title ?? row.id).toString();
      return { id: row.id, qty: row.qty, price, title };
    });

  const subtotal = Number(enriched.reduce((sum, row) => sum + row.price * row.qty, 0).toFixed(2));
  const orderId = generateLocalOrderId();
  const record: LocalOrderRecord = {
    id: orderId,
    createdAt: new Date().toISOString(),
    currency,
    subtotal,
    status: "processing",
    paymentStatus: "pending",
    checkout,
    items: enriched,
  };

  const orders = readLocalOrders();
  orders.unshift(record);
  writeLocalOrders(orders);
  return { order_id: orderId };
}

export type SearchProductsParams = {
  q?: string | null;
  sort_by?: "relevance" | "price" | "title";
  sort_dir?: "asc" | "desc";
  min_price?: number | null;
  max_price?: number | null;
  statuses?: string[] | null;
  limit_count?: number;
  offset_count?: number;
};



export type SearchProductsRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  price_amount: string;
  currency: string;
  price_cents: number;
  source: "ecom" | "products";
};

export async function searchProducts(params: SearchProductsParams = {}): Promise<SearchProductsRow[]> {
  const {
    q = null,
    sort_by = "relevance",
    sort_dir = "desc",
    min_price = null,
    max_price = null,
    statuses = ["active"],
    limit_count = 20,
    offset_count = 0,
  } = params;

  const { data, error } = await supabase.rpc("search_products", {
    q,
    sort_by,
    sort_dir,
    min_price,
    max_price,
    statuses,
    limit_count,
    offset_count,
  });

  if (error) throw error;

  return Array.isArray(data) ? (data as SearchProductsRow[]) : [];
}



export const API_BASE = "/api";

async function apiRequest(
  path: string,
  init: RequestInit = {},
  params?: Record<string, any>
): Promise<Response> {
  const url = new URL(API_BASE + path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return fetch(url.toString(), init);
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

// отправка отзыва через Next.js endpoint
export type AddReviewResponse = {
  ok?: boolean;
  review?: {
    rating: number;
    title: string;
    body: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
  } | null;
  stats?: { avg_rating: number; ratings_count: number } | null;
  code?: string;
  message?: string;
};

export async function addReview(p: {
  productId: string | number;
  rating: number;
  title: string;
  body: string;
}): Promise<AddReviewResponse> {
  const headers = await authHeaders();
  // Authorization заголовок добавляем, если доступен; сервер также примет cookie-сессию
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
  try {
    return JSON.parse(raw || 'null') as AddReviewResponse;
  } catch {
    return { ok: true };
  }
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
// Create an order for current authenticated user via Next.js function
export async function placeOrder(

  items: Array<{ id: string; qty: number }>,

  optionsOrCurrency?: string | PlaceOrderOptions

): Promise<{ order_id: string }> {

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



  if (!HAS_SUPABASE) {

    const effectiveCurrency = currency || "USD";

    return createLocalOrder(items, effectiveCurrency, checkoutPayload);

  }



  const token = await getValidAccessToken();

  // Гостевой чекаут: продолжаем без токена



  const payload: Record<string, unknown> = { items };

  if (currency) payload.currency = currency;

  if (checkoutPayload) payload.checkout = checkoutPayload;



  const res = await apiRequest("/orders-create", {

    method: "POST",

    headers: {

      accept: "application/json",

      "content-type": "application/json",

      // Добавляем авторизацию только если есть токен
      ...(token ? { authorization: `Bearer ${token}` } : {}),

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
  amount_subtotal?: number;
  amount_discounts?: number;
  amount_tax?: number;
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
  if (!HAS_SUPABASE) {
    const orders = readLocalOrders();
    return {
      items: orders.map((order) => ({
        id: order.id,
        created_at: order.createdAt,
        amount_total: order.subtotal,
        currency: order.currency,
        status: order.status,
        payment_status: order.paymentStatus ?? null,
      })) as OrderListItem[],
      count: orders.length,
      page: 1,
      page_size: orders.length || params.page_size || 20,
    };
  }

  const headers = await authHeaders();
  // Ensure user is authenticated
  // Authorization включаем по возможности; SSR cookie достаточно для /api/*
  const res = await apiRequest("/orders", { headers }, params);
  const raw = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(raw || "null");
  } catch {
    // Ignore JSON parse errors; downstream checks use status/raw fallback.
  }
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

  if (!HAS_SUPABASE) {

    const orders = readLocalOrders();

    const record = orders.find((order) => order.id === id);

    if (!record) {

      throw new Error('Order not found');

    }

    return {

      order: {

        id: record.id,

        created_at: record.createdAt,

        amount_subtotal: record.subtotal,

        amount_discounts: 0,

        amount_tax: 0,

        amount_total: record.subtotal,

        currency: record.currency,

        status: record.status,

        payment_status: record.paymentStatus ?? null,

      },

      items: record.items.map((item, index) => ({

        id: `${record.id}-${index}`,

        product_id: item.id,

        title: item.title,

        qty: item.qty,

        unit_price: item.price,

        total: Number((item.price * item.qty).toFixed(2)),

      })),

      payment: null,

    };

  }
  const headers = await authHeaders();
  // Authorization добавляется по возможности; сервер использует cookie при отсутствии
  const res = await apiRequest(`/orders/${encodeURIComponent(id)}`, { headers });
  const raw = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(raw || "null");
  } catch {
    // Ignore JSON parse errors; downstream checks use status/raw fallback.
  }
  if (!res.ok) throw new Error(String((data && (data.message || data.code)) || raw || res.status));
  return { order: data.order, items: data.items || [], payment: data.payment || null };
}

export async function cancelOrder(id: string) {
  if (!HAS_SUPABASE) {
    const orders = readLocalOrders();
    const record = orders.find((order) => order.id === id);
    if (record) {
      record.status = 'cancelled';
      record.paymentStatus = 'cancelled';
      writeLocalOrders(orders);
    }
    return true;
  }

  const headers = await authHeaders();
  // Authorization заголовок необязателен; оставляем cookie‑сессию
  const res = await apiRequest(`/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST', headers });
  const raw = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(raw || 'null');
  } catch {
    // Ignore JSON parse errors; downstream checks use status/raw fallback.
  }
  if (!res.ok) throw new Error(String((data && (data.message || data.code)) || raw || res.status));
  return true;
}

export async function confirmPayment(id: string, scenario?: "authorized" | "requires_action" | "failed" | "succeeded") {
  if (!HAS_SUPABASE) {
    const orders = readLocalOrders();
    const record = orders.find((order) => order.id === id);
    if (record) {
      switch (scenario) {
        case 'failed':
          record.status = 'failed';
          record.paymentStatus = 'failed';
          break;
        case 'requires_action':
          record.status = 'requires_action';
          record.paymentStatus = 'pending';
          break;
        case 'authorized':
          record.status = 'processing';
          record.paymentStatus = 'authorized';
          break;
        default:
          record.status = 'succeeded';
          record.paymentStatus = 'paid';
          break;
      }
      writeLocalOrders(orders);
      return { ok: true, status: record.status };
    }
    const fallbackStatus =
      scenario === 'failed' ? 'failed' : scenario === 'requires_action' ? 'requires_action' : 'succeeded';
    return { ok: true, status: fallbackStatus };
  }

  const headers = await authHeaders();
  // Authorization заголовок необязателен; оставляем cookie‑сессию
  const res = await apiRequest(
    `/orders/${encodeURIComponent(id)}/confirm-payment`,
    { method: 'POST', headers },
    scenario ? { scenario } : undefined
  );
  const raw = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(raw || 'null');
  } catch {
    // Ignore JSON parse errors; downstream checks use status/raw fallback.
  }
  if (!res.ok) throw new Error(String((data && (data.message || data.code)) || raw || res.status));
  return data as { ok: boolean; status: string; next_action?: any };
}

// --- ADD: расширенные типы для v2 поиска
export type SearchProductsV2Params = {
  q?: string | null;
  sort_by?: "relevance" | "price" | "title";
  sort_dir?: "asc" | "desc";
  min_price?: number | null;
  max_price?: number | null;
  statuses?: string[] | null;
  limit_count?: number;
  offset_count?: number;
  category_slugs?: string[] | null;
  skus?: string[] | null;
  sources?: ("ecom" | "products")[] | null;
  min_rating?: number | null;
};

// те же строки, что и раньше (функция возвращает 8 колонок)
export type SearchProductsV2Row = {
  id: string;
  slug: string;
  title: string;
  status: string;
  price_amount: string; // numeric как строка
  currency: string;
  price_cents: number;
  source: "ecom" | "products";
};
// --- ADD: v2 RPC для поиска
export async function searchProductsV2(
  p: SearchProductsV2Params = {}
): Promise<SearchProductsV2Row[]> {
  const {
    q = null,
    sort_by = "relevance",
    sort_dir = "desc",
    min_price = null,
    max_price = null,
    statuses = ["active"],
    limit_count = 20,
    offset_count = 0,
    category_slugs = null,
    skus = null,
    sources = null,
    min_rating = null,
  } = p;

  const { data, error } = await supabase.rpc("search_products_v2", {
    q,
    sort_by,
    sort_dir,
    min_price,
    max_price,
    statuses,
    limit_count,
    offset_count,
    category_slugs,
    skus,
    sources,
    min_rating,
  });

  if (error) throw error;
  return Array.isArray(data) ? (data as SearchProductsV2Row[]) : [];
}

// --- ADD: total для пагинации
export async function searchProductsV2Count(p: {
  q?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  statuses?: string[] | null;
  category_slugs?: string[] | null;
  skus?: string[] | null;
  sources?: ("ecom" | "products")[] | null;
  min_rating?: number | null;
} = {}): Promise<number> {
  const {
    q = null,
    min_price = null,
    max_price = null,
    statuses = ["active"],
    category_slugs = null,
    skus = null,
    sources = null,
    min_rating = null,
  } = p;

  const { data, error } = await supabase.rpc("search_products_v2_count", {
    q,
    min_price,
    max_price,
    statuses,
    category_slugs,
    skus,
    sources,
    min_rating,
  });

  if (error) throw error;
  return Number(data ?? 0);
}
// --- ADD: форматтер цены
export function formatPrice(row: { currency: string; price_cents: number }) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: row.currency || "USD",
  }).format((row.price_cents ?? 0) / 100);
}
// --- ADD: удобный хук (опционально)
import { useEffect, useState } from "react";

export function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function useProductsSearchV2(params: SearchProductsV2Params) {
  const [rows, setRows] = useState<SearchProductsV2Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(params, 300);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [list, count] = await Promise.all([
          searchProductsV2(debounced),
          searchProductsV2Count({
            q: debounced.q ?? null,
            min_price: debounced.min_price ?? null,
            max_price: debounced.max_price ?? null,
            statuses: debounced.statuses ?? ["active"],
            category_slugs: debounced.category_slugs ?? null,
            skus: debounced.skus ?? null,
            sources: debounced.sources ?? null,
            min_rating: debounced.min_rating ?? null,
          }),
        ]);
        if (!cancelled) {
          setRows(list);
          setTotal(count);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return { rows, total, loading };
}
