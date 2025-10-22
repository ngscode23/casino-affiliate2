import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { performance } from "perf_hooks";
import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import type { Database, Tables } from "@shared/lib/database.types";
import { resolveStatusFilters } from "@shared/lib/status-map";
import type {
  OrderDetails,
  OrderHistoryEntryDTO,
  OrderItemDTO,
  OrderListItem,
  OrderPayment,
  OrderRefund,
} from "../types/orders";
import { DEFAULT_CACHE_TTL_MS, resolveCacheAdapterFromEnv, type CacheAdapter } from "./cacheAdapters";

type PublicClient = SupabaseClient<Database>;

type OrderRow = Tables<"order_v2">;
type OrderTableRow = Tables<"orders">;
type PaymentRow = Tables<"payments">;
type RefundRow = Tables<"payment_refunds">;
type OrderItemRow = Tables<"order_items">;
type OrderHistoryRow = Tables<"order_history_v">;

type OrderViewFilterBuilder = PostgrestFilterBuilder<
  Database["__InternalSupabase"],
  Database["public"],
  OrderRow,
  OrderRow[]
>;

type SortColumn = "created_at" | "amount_total";
type SortDirection = "asc" | "desc";

export class AuthError extends Error {
  constructor(message = "Unauthenticated") {
    super(message);
    this.name = "AuthError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Order not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UpstreamError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "UpstreamError";
  }
}

export interface OrdersClientMetrics {
  log: (event: string, meta?: Record<string, unknown>) => void;
}

export interface OrdersClientConfig {
  supabase?: PublicClient;
  cache?: CacheAdapter;
  cacheAdapterName?: string;
  cacheTtlMs?: number;
  metrics?: OrdersClientMetrics;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
}

export interface ListOrdersParams {
  userId: string;
  from?: string;
  to?: string;
  status?: string;
  q?: string;
  sort?: SortColumn;
  dir?: SortDirection;
  cursor?: string;
  limit?: number;
}

type CursorPayload = {
  sortValue: string | number;
  createdAt: string;
  id: string;
};

const PAYMENT_SUCCESS_STATUSES = new Set([
  "succeeded",
  "paid",
  "captured",
  "settled",
]);

const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return 20;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.trunc(limit)));
}

function serializeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function deserializeCursor(cursor: string): CursorPayload {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch (error) {
    throw new UpstreamError("Invalid cursor", error);
  }
}

function normalizeCurrency(value: string | null | undefined): string {
  return (value ?? "EUR").trim().toUpperCase();
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildCacheKey(method: string, payload: Record<string, unknown>): string {
  return `orders:${method}:${JSON.stringify(payload)}`;
}

function applyCursorFilter(
  query: OrderViewFilterBuilder,
  cursorPayload: CursorPayload,
  sortColumn: SortColumn,
  ascending: boolean,
): OrderViewFilterBuilder {
  const comparator = ascending ? "gt" : "lt";
  const secondaryComparator = ascending ? "gt" : "lt";
  const mainValue = String(cursorPayload.sortValue);
  const createdAt = cursorPayload.createdAt;
  const id = cursorPayload.id;
  const sortValEncoded = encodeURIComponent(mainValue);
  const createdEncoded = encodeURIComponent(createdAt);
  const idEncoded = encodeURIComponent(id);
  const orParts = [
    `${sortColumn}.${comparator}.${sortValEncoded}`,
    `and(${sortColumn}.eq.${sortValEncoded},created_at.${comparator}.${createdEncoded})`,
    `and(${sortColumn}.eq.${sortValEncoded},created_at.eq.${createdEncoded},id.${secondaryComparator}.${idEncoded})`,
  ];
  query.or(orParts.join(","));
  return query;
}

type CompleteOrderRow = OrderRow & { id: string; user_id: string; created_at: string };

function isCompleteOrderRow(row: OrderRow): row is CompleteOrderRow {
  return Boolean(row?.id && row?.user_id && row?.created_at);
}

function mapOrderRow(row: CompleteOrderRow, paymentsIndex: Map<string, PaymentRow[]>): OrderListItem {
  const currency = normalizeCurrency(row.currency);
  const paymentRows = paymentsIndex.get(row.id) ?? [];
  const lastPayment = paymentRows[0];
  const subtotal = toNumber(row.amount_subtotal ?? row.amount_total);
  const discount = toNumber(row.amount_discounts);
  const tax = toNumber(row.amount_tax);
  const total = toNumber(row.amount_total ?? subtotal - discount + tax);

  const successPayment = paymentRows.find((payment) => PAYMENT_SUCCESS_STATUSES.has(payment.status?.toLowerCase?.() ?? ""));

  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    status: row.status ?? "pending",
    paymentStatus: row.payment_status ?? null,
    subtotal,
    discount,
    tax,
    total,
    shipping: 0,
    currency,
    lastPaymentStatus: lastPayment?.status ?? null,
    lastPaymentAt: successPayment?.created_at ?? lastPayment?.created_at ?? null,
  };
}

function mapOrderItem(row: OrderItemRow): OrderItemDTO {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    variantId: row.variant_id,
    title: row.title ?? "",
    quantity: row.qty ?? 0,
    unitPrice: toNumber(row.unit_price),
    total: toNumber(row.total),
    meta: row.meta as Record<string, unknown> | null,
  };
}

function mapPayment(row: PaymentRow): OrderPayment {
  return {
    id: row.id,
    orderId: row.order_id ?? "",
    provider: row.provider ?? null,
    providerRef: row.provider_ref ?? null,
    amount: toNumber(row.amount),
    currency: normalizeCurrency(row.currency),
    status: row.status ?? "pending",
    createdAt: row.created_at ?? "",
  };
}

function mapRefund(row: RefundRow): OrderRefund {
  const amountCents = typeof row.amount_cents === "number" ? row.amount_cents : 0;
  return {
    id: row.refund_id,
    orderId: row.order_id ?? "",
    paymentIntentId: row.payment_intent_id ?? null,
    amount: amountCents / 100,
    currency: normalizeCurrency(row.currency),
    reason: row.reason ?? null,
    createdAt: row.created_at ?? "",
  };
}

function mapHistory(row: OrderHistoryRow): OrderHistoryEntryDTO {
  const created = (row as { occurred_at?: string; created_at?: string }).occurred_at ?? row.created_at ?? "";
  const actor = (row as { actor?: string | null }).actor ?? null;
  const eventType = (row as { event_type?: string | null }).event_type ?? row.status ?? "unknown";
  const payload = ((row as { payload?: Record<string, unknown> | null }).payload ?? null) as Record<string, unknown> | null;
  return {
    occurredAt: created,
    actor,
    type: eventType,
    payload,
  };
}

export class OrdersClient {
  private readonly client: PublicClient;
  private readonly cache: CacheAdapter;
  private readonly cacheTtlMs: number;
  private readonly cacheAdapterName: string;
  private readonly metrics?: OrdersClientMetrics;

  constructor(config: OrdersClientConfig = {}) {
    this.metrics = config.metrics;

    if (config.supabase) {
      this.client = config.supabase;
    } else {
      const url = config.supabaseUrl ?? process.env.SUPABASE_URL;
      const key = config.supabaseServiceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) {
        throw new Error("Supabase credentials are not provided");
      }
      this.client = createClient<Database>(url, key, {
        auth: { persistSession: false },
      });
    }

    const cacheResolution = this.resolveCacheAdapter(config);
    this.cache = cacheResolution.adapter;
    this.cacheAdapterName = cacheResolution.name;
    this.cacheTtlMs = config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  private resolveCacheAdapter(config: OrdersClientConfig): { adapter: CacheAdapter; name: string } {
    if (config.cache) {
      return { adapter: config.cache, name: config.cacheAdapterName ?? "custom" };
    }
    return resolveCacheAdapterFromEnv();
  }

  getCacheMetadata() {
    return { adapter: this.cacheAdapterName, ttlMs: this.cacheTtlMs } as const;
  }

  /**
   * Универсальный метод для постраничного списка заказов. Возвращает DTO и
   * курсор для следующей страницы. Все запросы фильтруются по userId.
   */
  async listOrdersByDate(
    params: ListOrdersParams,
  ): Promise<{ items: OrderListItem[]; nextCursor?: string; total?: number; hasMore: boolean }> {
    const started = performance.now();
    const { userId, from, to, status, q, sort = "created_at", dir = "desc", cursor, limit } = params;
    if (!userId) throw new AuthError();
    const resolvedLimit = clampLimit(limit);
    const ascending = dir === "asc";

    const cacheKey = buildCacheKey("listOrdersByDate", { userId, from, to, status, q, sort, dir, cursor, limit: resolvedLimit });
    const cached = await this.cache.get<{ items: OrderListItem[]; nextCursor?: string; total?: number; hasMore: boolean }>(cacheKey);
    if (cached) {
      this.metrics?.log("orders.list.cache_hit", {
        userId,
        hit: true,
        adapter: this.cacheAdapterName,
        ttlMs: this.cacheTtlMs,
      });
      return cached;
    }

    const baseFilters = (query: OrderViewFilterBuilder): OrderViewFilterBuilder => {
      let qBuilder = query.eq("user_id", userId);
      if (from) qBuilder = qBuilder.gte("created_at", from);
      if (to) qBuilder = qBuilder.lte("created_at", to);

      if (typeof status === "string" && status.length) {
        const parts: string[] = buildSafeStatusOrClauses(status);
        if (parts.length > 0) {
          qBuilder = qBuilder.or(parts.join(","));
        }
      }

      if (typeof q === "string" && q.length) {
        const like = encodeURIComponent(q);
        qBuilder = qBuilder.or(`id.ilike.%${like}%,payment_intent_id.ilike.%${like}%`);
      }
      return qBuilder;
    };

    // Build an OR predicate for status filtering that avoids enum errors by
    // targeting each value only to the column where it is valid.
    function buildSafeStatusOrClauses(raw: string): string[] {
        const { order, payment } = resolveStatusFilters(raw);
        const clauses: string[] = [];
        if (order.length > 0) {
          const list = order.map(encodeURIComponent).join(".");
          clauses.push(`status.in.(${list})`);
        }
        if (payment.length > 0) {
          const list = payment.map(encodeURIComponent).join(".");
          clauses.push(`payment_status.in.(${list})`);
        }
        return clauses;
      }

    let query = baseFilters(
      this.client
        .from("order_v2")
        .select(
          "id, user_id, created_at, amount_total, amount_subtotal, amount_discounts, amount_tax, currency, status, payment_status",
          { count: "exact" },
        ),
    );

    if (cursor) {
      const decoded = deserializeCursor(cursor);
      query = applyCursorFilter(query, decoded, sort, ascending);
    }

    query = query.order(sort, { ascending });
    if (sort !== "created_at") {
      query = query.order("created_at", { ascending });
    }
    query = query.order("id", { ascending }).limit(resolvedLimit + 1);

    const response = await query;

    if (response.error) {
      throw new UpstreamError(`Failed to fetch orders list: ${response.error.message}`, response.error);
    }

    const rows = (response.data ?? []) as OrderRow[];
    const hasMore = rows.length > resolvedLimit;
    const pageRows = hasMore ? rows.slice(0, resolvedLimit) : rows;
    const normalizedRows = pageRows.filter(isCompleteOrderRow) as CompleteOrderRow[];
    const orderIds = normalizedRows.map((row) => row.id);
    const payments = orderIds.length ? await this.fetchPaymentsForList(orderIds) : [];

    const paymentsIndex = new Map<string, PaymentRow[]>();
    for (const payment of payments) {
      if (!payment.order_id) continue;
      if (!paymentsIndex.has(payment.order_id)) {
        paymentsIndex.set(payment.order_id, []);
      }
      paymentsIndex.get(payment.order_id)!.push(payment);
    }

    const items = normalizedRows.map((row) => mapOrderRow(row, paymentsIndex));

    let nextCursor: string | undefined;
    const last = normalizedRows[normalizedRows.length - 1];
    if (hasMore && last) {
      const sortValue = sort === "amount_total" ? toNumber(last.amount_total ?? 0) : last.created_at;
      nextCursor = serializeCursor({
        sortValue,
        createdAt: last.created_at,
        id: last.id,
      });
    }

    const result = { items, nextCursor, total: response.count ?? undefined, hasMore };

    await this.cache.set(cacheKey, result, { ttlMs: this.cacheTtlMs });
    this.metrics?.log("orders.list.cache_miss", {
      userId,
      hit: false,
      tookMs: performance.now() - started,
      adapter: this.cacheAdapterName,
      ttlMs: this.cacheTtlMs,
    });
    return result;
  }

  /**
   * Детальный заказ со связанными сущностями. Используется на странице
   * подробностей.
   */
  async getOrderDetails(orderId: string, userId: string): Promise<OrderDetails> {
    if (!userId) throw new AuthError();
    const started = performance.now();
    const cacheKey = buildCacheKey("order.details", { orderId, userId });
    const cached = await this.cache.get<OrderDetails>(cacheKey);
    if (cached) {
      this.metrics?.log("orders.details.cache_hit", {
        orderId,
        userId,
        hit: true,
        adapter: this.cacheAdapterName,
        ttlMs: this.cacheTtlMs,
      });
      return cached;
    }

    const summary = await this.fetchOrderSummary(orderId, userId);
    if (!summary) throw new NotFoundError();

    const [items, payments, refunds, history] = await Promise.all([
      this.fetchOrderItems(orderId, userId),
      this.fetchPayments(orderId, userId),
      this.fetchRefunds(orderId, userId),
      this.fetchOrderHistory(orderId, userId),
    ]);

    const details: OrderDetails = {
      order: { ...summary },
      items,
      payments,
      refunds,
      history,
    };

    if (payments.length) {
      details.order.lastPaymentStatus = payments[0].status;
      details.order.lastPaymentAt = payments[0].createdAt;
      const successPayment =
        payments.find((payment) => PAYMENT_SUCCESS_STATUSES.has(payment.status?.toLowerCase?.() ?? "")) ?? null;
      if (successPayment) {
        details.order.lastPaymentAt = successPayment.createdAt;
        details.order.lastPaymentStatus = successPayment.status;
      }
    }

    await this.cache.set(cacheKey, details, { ttlMs: this.cacheTtlMs });
    this.metrics?.log("orders.details.cache_miss", {
      orderId,
      userId,
      hit: false,
      tookMs: performance.now() - started,
      adapter: this.cacheAdapterName,
      ttlMs: this.cacheTtlMs,
    });
    return details;
  }

  async getOrderPayments(orderId: string, userId: string): Promise<OrderPayment[]> {
    const cacheKey = buildCacheKey("order.payments", { orderId, userId });
    const cached = await this.cache.get<OrderPayment[]>(cacheKey);
    if (cached) return cached;
    const payments = await this.fetchPayments(orderId, userId);
    await this.cache.set(cacheKey, payments, { ttlMs: this.cacheTtlMs });
    return payments;
  }

  async getOrderRefunds(orderId: string, userId: string): Promise<OrderRefund[]> {
    const cacheKey = buildCacheKey("order.refunds", { orderId, userId });
    const cached = await this.cache.get<OrderRefund[]>(cacheKey);
    if (cached) return cached;
    const refunds = await this.fetchRefunds(orderId, userId);
    await this.cache.set(cacheKey, refunds, { ttlMs: this.cacheTtlMs });
    return refunds;
  }

  async getOrderItems(orderId: string, userId: string): Promise<OrderItemDTO[]> {
    const cacheKey = buildCacheKey("order.items", { orderId, userId });
    const cached = await this.cache.get<OrderItemDTO[]>(cacheKey);
    if (cached) return cached;
    const items = await this.fetchOrderItems(orderId, userId);
    await this.cache.set(cacheKey, items, { ttlMs: this.cacheTtlMs });
    return items;
  }

  async resetOrdersCache(keys?: string[]): Promise<void> {
    if (!keys?.length) {
      await this.cache.flush();
      return;
    }
    for (const key of keys) {
      await this.cache.delete(key);
    }
  }

  private async fetchOrderSummary(orderId: string, userId: string): Promise<OrderDetails["order"] | null> {
    const response = await this.client
      .from("orders")
      .select(
        "id, user_id, created_at, subtotal, discount_total, amount_cents, grand_total, shipping_total, currency, status, payment_status, checkout_metadata, contact_email, metadata_b, paid_at, cancelled_at, payment_intent_id",
      )
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (response.error) {
      throw new UpstreamError(`Failed to fetch order summary: ${response.error.message}`, response.error);
    }

    const data = (response.data ?? null) as OrderTableRow | null;
    if (!data) return null;

    const amountCents = typeof data.amount_cents === "number" ? data.amount_cents : 0;
    const centsToAmount = amountCents / 100;
    const subtotalBase = data.subtotal ?? data.grand_total ?? centsToAmount;
    const subtotal = toNumber(subtotalBase);
    const discount = toNumber(data.discount_total);
    const total = toNumber(data.grand_total ?? subtotal - discount);
    const tax = Math.max(0, total - subtotal + discount);

    const checkoutMetadata = (data.checkout_metadata ?? null) as Record<string, unknown> | null;
    const metadata = (data.metadata_b ?? null) as Record<string, unknown> | null;

    return {
      id: data.id,
      userId: data.user_id,
      createdAt: data.created_at,
      status: data.status ?? "pending",
      paymentStatus: data.payment_status ?? null,
      subtotal,
      discount,
      tax,
      total,
      shipping: toNumber(data.shipping_total),
      currency: normalizeCurrency(data.currency),
      lastPaymentStatus: null,
      lastPaymentAt: null,
      checkoutMetadata,
      contactEmail: data.contact_email,
      paymentIntentId: data.payment_intent_id ?? null,
      metadata,
      paidAt: data.paid_at ?? null,
      cancelledAt: data.cancelled_at ?? null,
    };
  }

  private async fetchOrderItems(orderId: string, _userId: string): Promise<OrderItemDTO[]> {
    const response = await this.client
      .from("order_items")
      .select("id, order_id, product_id, variant_id, title, qty, unit_price, total, meta")
      .eq("order_id", orderId);

    if (response.error) {
      throw new UpstreamError(`Failed to fetch order items: ${response.error.message}`, response.error);
    }

    const rows = (response.data ?? []) as OrderItemRow[];
    return rows.map(mapOrderItem);
  }

  private async fetchPayments(orderId: string, _userId: string): Promise<OrderPayment[]> {
    const response = await this.client
      .from("payments")
      .select("id, order_id, provider, provider_ref, amount, currency, status, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (response.error) throw new UpstreamError(`Failed to fetch payments: ${response.error.message}`, response.error);
    const rows = (response.data ?? []) as PaymentRow[];
    return rows.map(mapPayment);
  }

  private async fetchPaymentsForList(orderIds: string[]): Promise<PaymentRow[]> {
    if (!orderIds.length) return [];
    const response = await this.client
      .from("payments")
      .select("order_id, id, status, created_at, amount, currency, provider, provider_ref")
      .in("order_id", orderIds)
      .order("created_at", { ascending: false });

    if (response.error) throw new UpstreamError(`Failed to fetch payments helper: ${response.error.message}`, response.error);
    const rows = (response.data ?? []) as PaymentRow[];
    return rows.filter((row) => Boolean(row.order_id));
  }

  private async fetchRefunds(orderId: string, _userId: string): Promise<OrderRefund[]> {
    const response = await this.client
      .from("payment_refunds")
      .select("refund_id, order_id, payment_intent_id, amount_cents, currency, reason, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (response.error) throw new UpstreamError(`Failed to fetch refunds: ${response.error.message}`, response.error);
    const rows = (response.data ?? []) as RefundRow[];
    return rows.map(mapRefund);
  }

  private async fetchOrderHistory(orderId: string, _userId: string): Promise<OrderHistoryEntryDTO[]> {
    // Prefer the audit table if present: richer, stable schema
    const audit = await this.client
      .from("order_status_audit")
      .select("order_id, old_status, new_status, changed_by, changed_at, reason, source")
      .eq("order_id", orderId)
      .order("changed_at", { ascending: false });

    if (!audit.error && Array.isArray(audit.data) && audit.data.length > 0) {
      return (audit.data as any[]).map((row) => ({
        occurredAt: String(row.changed_at ?? new Date().toISOString()),
        actor: row.changed_by ? String(row.changed_by) : null,
        type: String(row.new_status ?? "status_changed"),
        payload: {
          old_status: row.old_status ?? null,
          new_status: row.new_status ?? null,
          reason: row.reason ?? null,
          source: row.source ?? null,
        } as Record<string, unknown>,
      }));
    }

    // Fallback to view if audit table not available. Map minimal fields.
    const response = await this.client
      .from("order_history_v")
      .select("order_id, created_at, status, amount, currency")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (response.error) {
      throw new UpstreamError(`Failed to fetch order history: ${response.error.message}`, response.error);
    }
    const rows = (response.data ?? []) as any[];
    return rows.map((row) => ({
      occurredAt: String(row.created_at ?? new Date().toISOString()),
      actor: null,
      type: String(row.status ?? "event"),
      payload: {
        amount: row.amount ?? null,
        currency: row.currency ?? null,
      } as Record<string, unknown>,
    }));
  }
}

let singletonClient: OrdersClient | null = null;

export function getOrdersClient(config?: OrdersClientConfig): OrdersClient {
  if (config) {
    singletonClient = new OrdersClient(config);
    return singletonClient;
  }
  if (!singletonClient) {
    singletonClient = new OrdersClient();
  }
  return singletonClient;
}

export async function listOrdersByDate(params: ListOrdersParams) {
  return getOrdersClient().listOrdersByDate(params);
}

export async function getOrderDetails(orderId: string, userId: string) {
  return getOrdersClient().getOrderDetails(orderId, userId);
}

export async function getOrderPayments(orderId: string, userId: string) {
  return getOrdersClient().getOrderPayments(orderId, userId);
}

export async function getOrderRefunds(orderId: string, userId: string) {
  return getOrdersClient().getOrderRefunds(orderId, userId);
}

export async function getOrderItems(orderId: string, userId: string) {
  return getOrdersClient().getOrderItems(orderId, userId);
}

export async function resetOrdersCache(keys?: string[]) {
  try {
    const hasEnv = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!hasEnv) return;
    await getOrdersClient().resetOrdersCache(keys);
  } catch {
    // In test or env without Supabase credentials, silently skip cache reset
  }
}

export { InMemoryCacheAdapter } from "./cacheAdapters";
