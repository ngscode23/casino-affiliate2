import { describe, expect, it, vi } from "vitest";

import { InMemoryCacheAdapter } from "../src/sdk/cacheAdapters";
import { OrdersClient } from "../src/sdk/ordersClient";

// Простая заглушка Supabase, которая возвращает заранее подготовленные ответы.
function createStubSupabase(responses: Record<string, any>) {
  const orCalls: string[] = [];
  Object.defineProperty(responses, "__orCalls", {
    value: orCalls,
    enumerable: false,
    configurable: true,
    writable: true,
  });
  return {
    from(table: string) {
      const self = this;
      const state: { table: string; count?: number; single?: boolean } = { table };
      const builder: any = {
        select(_columns?: string, options?: { count?: string }) {
          if (options?.count === "exact") {
            const response = responses[state.table] ?? { data: [], count: 0 };
            state.count = response.count ?? response.data?.length ?? 0;
          }
          return builder;
        },
        eq() {
          return builder;
        },
        gte() {
          return builder;
        },
        lte() {
          return builder;
        },
        or(value?: string) {
          if (typeof value === "string") {
            orCalls.push(value);
          }
          return builder;
        },
        in() {
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        maybeSingle: async () => {
          const response = responses[state.table] ?? { data: [], error: null };
          return { data: response.data?.[0] ?? null, error: response.error ?? null };
        },
        then(onFulfilled: any, onRejected?: any) {
          const response = responses[state.table] ?? { data: [], error: null };
          const payload = {
            data: response.data ?? [],
            error: response.error ?? null,
            count: state.count ?? response.count ?? response.data?.length ?? null,
          };
          return Promise.resolve(payload).then(onFulfilled, onRejected);
        },
        catch(onRejected: any) {
          const response = responses[state.table] ?? { data: [], error: null };
          const payload = {
            data: response.data ?? [],
            error: response.error ?? null,
            count: state.count ?? response.count ?? response.data?.length ?? null,
          };
          return Promise.resolve(payload).catch(onRejected);
        },
      };
      return builder;
    },
  };
}

describe("OrdersClient", () => {
  it("возвращает нормализованные суммы, курсор и hasMore", async () => {
    const responses = {
      order_v2: {
        data: [
          {
            id: "ord-1",
            user_id: "user-1",
            created_at: "2025-07-01T10:00:00Z",
            amount_total: 95,
            amount_subtotal: 100,
            amount_discounts: 5,
            amount_tax: 0,
            currency: "eur",
            status: "paid",
            payment_status: "succeeded",
          },
          {
            id: "ord-2",
            user_id: "user-1",
            created_at: "2025-06-30T08:00:00Z",
            amount_total: 80,
            amount_subtotal: 80,
            amount_discounts: 0,
            amount_tax: 0,
            currency: "eur",
            status: "paid",
            payment_status: "succeeded",
          },
        ],
        count: 2,
      },
      payments: {
        data: [
          {
            id: "pay-1",
            order_id: "ord-1",
            provider: "stripe",
            provider_ref: "pi_123",
            amount: 95,
            currency: "EUR",
            status: "succeeded",
            created_at: "2025-07-01T11:00:00Z",
          },
          {
            id: "pay-2",
            order_id: "ord-2",
            provider: "stripe",
            provider_ref: "pi_124",
            amount: 80,
            currency: "EUR",
            status: "succeeded",
            created_at: "2025-06-30T09:00:00Z",
          },
        ],
      },
    };

    const metrics = { log: vi.fn() };
    const client = new OrdersClient({
      supabase: createStubSupabase(responses) as any,
      cache: new InMemoryCacheAdapter(),
      metrics,
    });

    const result = await client.listOrdersByDate({ userId: "user-1", limit: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      subtotal: 100,
      discount: 5,
      total: 95,
      currency: "EUR",
      lastPaymentStatus: "succeeded",
    });
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeDefined();

    await client.listOrdersByDate({ userId: "user-1", limit: 1 });
const hitCall = (metrics.log.mock.calls as Array<[string, Record<string, unknown>?]>).find(([event]) => event === "orders.list.cache_hit");
    expect(hitCall?.[1]?.hit).toBe(true);
  });

  it("отмечает конец списка когда записей меньше лимита", async () => {
    const responses = {
      order_v2: {
        data: [
          {
            id: "ord-3",
            user_id: "user-1",
            created_at: "2025-07-05T12:00:00Z",
            amount_total: 50,
            amount_subtotal: 50,
            amount_discounts: 0,
            amount_tax: 0,
            currency: "eur",
            status: "paid",
            payment_status: "succeeded",
          },
        ],
        count: 1,
      },
      payments: { data: [] },
    };

    const client = new OrdersClient({
      supabase: createStubSupabase(responses) as any,
      cache: new InMemoryCacheAdapter(),
    });

    const result = await client.listOrdersByDate({ userId: "user-1", limit: 5 });
    expect(result.items).toHaveLength(1);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
  });

  it("возвращает детали заказа с платежами и возвратами", async () => {
    const responses = {
      orders: {
        data: [
          {
            id: "ord-2",
            user_id: "user-1",
            created_at: "2025-06-01T09:00:00Z",
            subtotal: 150,
            discount_total: 0,
            shipping_total: 10,
            grand_total: 160,
            currency: "EUR",
            status: "paid",
            payment_status: "succeeded",
          },
        ],
      },
      order_items: {
        data: [
          { id: "it-1", order_id: "ord-2", product_id: "prod-1", variant_id: null, title: "Product", qty: 2, unit_price: 75, total: 150, meta: null },
        ],
      },
      payments: {
        data: [
          { id: "pay-2", order_id: "ord-2", provider: "stripe", provider_ref: "pi_456", amount: 160, currency: "eur", status: "succeeded", created_at: "2025-06-01T10:00:00Z" },
        ],
      },
      payment_refunds: { data: [] },
      order_history_v: { data: [{ order_id: "ord-2", occurred_at: "2025-06-01T10:05:00Z", actor: "system", event_type: "payment_succeeded", payload: null }] },
    };

    const client = new OrdersClient({
      supabase: createStubSupabase(responses) as any,
      cache: new InMemoryCacheAdapter(),
    });

  const details = await client.getOrderDetails("ord-2", "user-1");
  expect(details.order.total).toBe(160);
  expect(details.order.lastPaymentStatus).toBe("succeeded");
  expect(details.items).toHaveLength(1);
  expect(details.payments[0].currency).toBe("EUR");
  expect(details.history).toHaveLength(1);
  });

  it("applies payment status filters via OR clauses", async () => {
    const responses: Record<string, any> = {
      order_v2: { data: [], count: 0 },
      payments: { data: [] },
      payment_refunds: { data: [] },
      order_history_v: { data: [] },
    };

    const client = new OrdersClient({
      supabase: createStubSupabase(responses) as any,
      cache: new InMemoryCacheAdapter(),
    });

    await client.listOrdersByDate({ userId: "user-1", status: "succeeded" });

    const orClauses: string[] = (responses as any).__orCalls ?? [];
    expect(orClauses.some((clause) => clause.includes("status.in.(paid)"))).toBe(true);
    expect(orClauses.some((clause) => clause.includes("payment_status.in.(succeeded)"))).toBe(true);
  });
});
