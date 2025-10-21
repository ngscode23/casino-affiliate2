import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../lib/database.types";
import type {
  OrderDetail,
  OrderHistoryEntry,
  OrderItemRow,
  OrderStatus,
  OrderSummary,
  PaginatedOrders,
  PaymentRow,
  RefundRow,
} from "../types/orders";

/**
 * Orders SDK consolidates cross-surface Supabase access. It keeps queries
 * aligned with existing indexes (idx_orders_user_id_created_at,
 * orders_user_status_created_idx, payments_order_created_idx) and relies on
 * lightweight in-memory caching to reduce duplicate network round-trips in
 * SSR/edge contexts. The cache is per-process and should be invalidated when
 * background mutations (e.g. Edge Functions archiving to orders_archive)
 * complete via resetOrdersCache().
 */

type PublicClient = SupabaseClient<Database>;

type CacheRecord<T> = {
  expiresAt: number;
  value: T;
};

const CACHE_TTL_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 100;

const cache = new Map<string, CacheRecord<unknown>>();

function createCacheKey(method: string, input: unknown): string {
  return `${method}:${JSON.stringify(input)}`;
}

function getFromCache<T>(key: string): T | undefined {
  const record = cache.get(key);
  if (!record) return undefined;
  if (record.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return record.value as T;
}

function setCache<T>(key: string, value: T): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function sleep(durationMs: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt < MAX_RETRIES) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt >= MAX_RETRIES) break;
      const backoff = RETRY_DELAY_BASE_MS * 2 ** (attempt - 1);
      await sleep(backoff);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function normalizeCurrency(currency: string | null | undefined): string {
  if (!currency) return "";
  return currency.trim().toUpperCase();
}

function mapSummary(row: {
  id: string;
  user_id: string;
  created_at: string;
  amount_total?: number | null;
  amount_subtotal?: number | null;
  amount_discounts?: number | null;
  amount_tax?: number | null;
  grand_total?: number | null;
  currency: string | null;
  status: string | null;
  payment_status?: string | null;
}): OrderSummary {
  const subtotal = Number(row.amount_subtotal ?? row.grand_total ?? 0);
  const discounts = Number(row.amount_discounts ?? 0);
  const taxes = Number(row.amount_tax ?? 0);
  const total = Number(row.amount_total ?? row.grand_total ?? subtotal - discounts + taxes);
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    totalAmount: total,
    subtotalAmount: subtotal,
    discountAmount: discounts,
    taxAmount: taxes,
    currency: normalizeCurrency(row.currency) || "EUR",
    status: (row.status ?? "unknown") as OrderStatus,
    paymentStatus: (row.payment_status ?? null) as OrderSummary["paymentStatus"],
  };
}

async function fetchOrderSummary(
  client: PublicClient,
  orderId: string,
  options: { userId?: string } = {},
): Promise<OrderSummary | null> {
  return withRetry(async () => {
    let baseQuery = client
      .from("order_v2")
      .select(
        "id, user_id, created_at, amount_total, amount_subtotal, amount_discounts, amount_tax, currency, status, payment_status",
      )
      .eq("id", orderId)
      .limit(1);
    if (options.userId) {
      baseQuery = baseQuery.eq("user_id", options.userId);
    }
    const { data, error } = await baseQuery.maybeSingle();
    if (error && error.code !== "PGRST116") {
      throw new Error(`order_v2 lookup failed: ${error.message}`);
    }
    if (data && data.id && data.user_id && data.created_at) {
      return mapSummary(data as {
        id: string;
        user_id: string;
        created_at: string;
        amount_total?: number | null;
        amount_subtotal?: number | null;
        amount_discounts?: number | null;
        amount_tax?: number | null;
        grand_total?: number | null;
        currency: string | null;
        status: string | null;
        payment_status?: string | null;
      });
    }

    let fallbackQuery = client
      .from("orders")
      .select(
        "id, user_id, created_at, grand_total, subtotal, discount_total, shipping_total, currency, status",
      )
      .eq("id", orderId)
      .limit(1);
    if (options.userId) {
      fallbackQuery = fallbackQuery.eq("user_id", options.userId);
    }
    const { data: legacy, error: legacyError } = await fallbackQuery.maybeSingle();
    if (legacyError && legacyError.code !== "PGRST116") {
      throw new Error(`orders lookup failed: ${legacyError.message}`);
    }
    if (!legacy || !legacy.id || !legacy.user_id || !legacy.created_at) return null;
    const subtotal = Number((legacy as any).subtotal ?? (legacy as any).grand_total ?? 0);
    const discount = Number((legacy as any).discount_total ?? 0);
    const shipping = Number((legacy as any).shipping_total ?? 0);
    const total = Number((legacy as any).grand_total ?? subtotal - discount + shipping);
    return mapSummary({
      ...legacy,
      id: legacy.id as string,
      user_id: legacy.user_id as string,
      created_at: legacy.created_at as string,
      amount_total: total,
      amount_subtotal: subtotal,
      amount_discounts: discount,
      amount_tax: shipping,
      payment_status: null,
    });
  });
}

async function fetchOrderHistory(client: PublicClient, orderId: string): Promise<OrderHistoryEntry[]> {
  return withRetry(async () => {
    const { data, error } = await client
      .from("order_history_v")
      .select("order_id, created_at, amount, currency, status")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`order_history_v query failed: ${error.message}`);
    return (data ?? []).map((row) => ({
      orderId: row.order_id ?? orderId,
      createdAt: row.created_at ?? new Date().toISOString(),
      amount: Number(row.amount ?? 0),
      currency: normalizeCurrency(row.currency) || "EUR",
      status: row.status ?? "unknown",
    }));
  });
}

async function fetchOrderItems(client: PublicClient, orderId: string): Promise<OrderItemRow[]> {
  return withRetry(async () => {
    const { data, error } = await client
      .from("order_items")
      .select("id, order_id, product_id, title, qty, unit_price, total")
      .eq("order_id", orderId)
      .order("title", { ascending: true });
    if (error) throw new Error(`order_items query failed: ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id,
      orderId: String(row.order_id ?? orderId),
      productId: row.product_id,
      title: row.title,
      quantity: row.qty,
      unitPrice: Number(row.unit_price ?? 0),
      total: Number(row.total ?? row.unit_price ?? 0),
    }));
  });
}

async function fetchPayments(client: PublicClient, orderId: string): Promise<PaymentRow[]> {
  return withRetry(async () => {
    const { data, error } = await client
      .from("payments")
      .select("id, order_id, amount, currency, status, provider, provider_ref, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`payments query failed: ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id,
      orderId: String(row.order_id ?? orderId),
      amount: Number(row.amount ?? 0),
      currency: row.currency ? normalizeCurrency(row.currency) : null,
      status: (row.status ?? "unknown") as PaymentRow["status"],
      provider: row.provider ?? null,
      providerReference: row.provider_ref ?? null,
      createdAt: row.created_at,
    }));
  });
}

async function fetchRefunds(client: PublicClient, orderId: string): Promise<RefundRow[]> {
  return withRetry(async () => {
    const { data, error } = await client
      .from("payment_refunds")
      .select("refund_id, order_id, payment_intent_id, amount_cents, currency, reason, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`payment_refunds query failed: ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.refund_id,
      orderId: row.order_id,
      paymentIntentId: row.payment_intent_id ?? null,
      amountCents: Number(row.amount_cents ?? 0),
      currency: row.currency ? normalizeCurrency(row.currency) : null,
      reason: row.reason ?? null,
      createdAt: row.created_at,
    }));
  });
}

/**
 * Returns the most recent orders for a user. Uses order_v2 to benefit from
 * currency normalization and materialized totals. Queries leverage the
 * idx_orders_user_id_created_at index via user + created_at ordering.
 */
export async function listRecentOrders(
  client: PublicClient,
  userId: string,
  limit = 10,
): Promise<OrderSummary[]> {
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const cacheKey = createCacheKey("listRecentOrders", { userId, limit: safeLimit });
  const cached = getFromCache<OrderSummary[]>(cacheKey);
  if (cached !== undefined) return cached;

  const result = await withRetry(async () => {
    const { data, error } = await client
      .from("order_v2")
      .select(
        "id, user_id, created_at, amount_total, amount_subtotal, amount_discounts, amount_tax, currency, status, payment_status",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    if (error) throw new Error(`order_v2 recent query failed: ${error.message}`);
    const rows = (data ?? []).filter((row) => Boolean(row && row.id && row.user_id && row.created_at));
    return rows.map((r) =>
      mapSummary({
        id: String((r as any).id),
        user_id: String((r as any).user_id),
        created_at: String((r as any).created_at),
        amount_total: (r as any).amount_total ?? null,
        amount_subtotal: (r as any).amount_subtotal ?? null,
        amount_discounts: (r as any).amount_discounts ?? null,
        amount_tax: (r as any).amount_tax ?? null,
        grand_total: null,
        currency: (r as any).currency ?? null,
        status: (r as any).status ?? null,
        payment_status: (r as any).payment_status ?? null,
      }),
    );
  });

  setCache(cacheKey, result);
  return result;
}

/**
 * Lists orders for a user within a date range. Pagination uses range to
 * minimize payload and aligns with orders_user_status_created_idx when
 * filtering by status.
 */
export async function listOrdersByDate(
  client: PublicClient,
  userId: string,
  from?: string | null,
  to?: string | null,
  status?: OrderStatus | null,
  sortColumn: "created_at" | "amount_total" = "created_at",
  ascending = false,
  page = 1,
  perPage = 20,
  search?: string | null,
): Promise<PaginatedOrders> {
  const safePage = Math.max(1, page);
  const safePerPage = Math.max(1, Math.min(perPage, 100));
  const offset = (safePage - 1) * safePerPage;
  const cacheKey = createCacheKey("listOrdersByDate", {
    userId,
    from: from ?? null,
    to: to ?? null,
    status: status ?? null,
    search: search ?? null,
    sortColumn,
    ascending,
    safePage,
    safePerPage,
  });
  const cached = getFromCache<PaginatedOrders>(cacheKey);
  if (cached !== undefined) return cached;

  const result = await withRetry(async () => {
    let query = client
      .from("order_v2")
      .select(
        "id, user_id, created_at, amount_total, amount_subtotal, amount_discounts, amount_tax, currency, status, payment_status",
        { count: "exact" },
      )
      .eq("user_id", userId);
    if (from) {
      query = query.gte("created_at", from);
    }
    if (to) {
      query = query.lte("created_at", to);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (search) {
      query = query.ilike("id", `%${search}%`);
    }

    const { data, error, count } = await query
      .order(sortColumn, { ascending })
      .range(offset, offset + safePerPage - 1);
    if (error) throw new Error(`order_v2 paginated query failed: ${error.message}`);

    const rows = (data ?? []).filter((row) => Boolean(row && row.id && row.user_id && row.created_at));

    return {
      items: rows.map((r) =>
        mapSummary({
          id: String((r as any).id),
          user_id: String((r as any).user_id),
          created_at: String((r as any).created_at),
          amount_total: (r as any).amount_total ?? null,
          amount_subtotal: (r as any).amount_subtotal ?? null,
          amount_discounts: (r as any).amount_discounts ?? null,
          amount_tax: (r as any).amount_tax ?? null,
          grand_total: null,
          currency: (r as any).currency ?? null,
          status: (r as any).status ?? null,
          payment_status: (r as any).payment_status ?? null,
        }),
      ),
      page: safePage,
      perPage: safePerPage,
      total: count ?? (data?.length ?? 0),
    } satisfies PaginatedOrders;
  });

  setCache(cacheKey, result);
  return result;
}

/**
 * Fetches a rich order view including line items, payments, refunds and
 * history stream. Future archival support can hook into the fallback path
 * by trying orders_archive before the legacy orders table.
 */
export async function getOrderDetails(
  client: PublicClient,
  orderId: string,
  options: { userId?: string } = {},
): Promise<OrderDetail | null> {
  const cacheKey = createCacheKey("getOrderDetails", { orderId, userId: options.userId });
  const cached = getFromCache<OrderDetail | null>(cacheKey);
  if (cached !== undefined) return cached;

  const summary = await fetchOrderSummary(client, orderId, options);
  if (!summary) {
    setCache(cacheKey, null);
    return null;
  }

  const [items, payments, refunds, history] = await Promise.all([
    fetchOrderItems(client, orderId),
    fetchPayments(client, orderId),
    fetchRefunds(client, orderId),
    fetchOrderHistory(client, orderId),
  ]);

  const detail: OrderDetail = {
    summary,
    items,
    payments,
    refunds,
    history,
  };

  setCache(cacheKey, detail);
  return detail;
}

/**
 * Lightweight helpers for accessing related resources individually. These
 * can be composed in UI components that need partial information without
 * the full detail payload.
 */
export async function getOrderItems(
  client: PublicClient,
  orderId: string,
): Promise<OrderItemRow[]> {
  const cacheKey = createCacheKey("getOrderItems", { orderId });
  const cached = getFromCache<OrderItemRow[]>(cacheKey);
  if (cached !== undefined) return cached;

  const items = await fetchOrderItems(client, orderId);
  setCache(cacheKey, items);
  return items;
}

export async function getOrderPayments(
  client: PublicClient,
  orderId: string,
): Promise<PaymentRow[]> {
  const cacheKey = createCacheKey("getOrderPayments", { orderId });
  const cached = getFromCache<PaymentRow[]>(cacheKey);
  if (cached !== undefined) return cached;

  const payments = await fetchPayments(client, orderId);
  setCache(cacheKey, payments);
  return payments;
}

export async function getOrderRefunds(
  client: PublicClient,
  orderId: string,
): Promise<RefundRow[]> {
  const cacheKey = createCacheKey("getOrderRefunds", { orderId });
  const cached = getFromCache<RefundRow[]>(cacheKey);
  if (cached !== undefined) return cached;

  const refunds = await fetchRefunds(client, orderId);
  setCache(cacheKey, refunds);
  return refunds;
}

/**
 * Clears all in-memory caches. Useful for tests or invalidation hooks when
 * integrating with background jobs (e.g. archiving tasks).
 */
export function resetOrdersCache(): void {
  cache.clear();
}
