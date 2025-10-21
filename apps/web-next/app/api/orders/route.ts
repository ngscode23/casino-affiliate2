import { normalizeSort, qsNumber, formatRangeEnd, toNumber, json } from "./utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { sanitizeSearchParam } from "@shared/lib/sanitize";
import { getOrdersClient } from "@shared/sdk/ordersClient";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const supabase = getAdminClient();
  const url = new URL(request.url);
  const params = url.searchParams;
  const started = Date.now();

  const statusFilter = (params.get("status") ?? "").trim().toLowerCase();
  const query = sanitizeSearchParam(params.get("q"));
  const fromRaw = params.get("from")?.trim() ?? null;
  const toRaw = params.get("to")?.trim() ?? null;
  const sort = normalizeSort(params.get("sort"));
  const cursorParam = params.get("cursor")?.trim() ?? undefined;
  const limit = qsNumber(params.get("page_size") ?? params.get("limit"), 20, {
    min: 1,
    max: 100,
    round: true,
  });

  try {
    const rangeParams: { from?: string; to?: string } = {};
    if (fromRaw) {
      const fromDate = new Date(fromRaw);
      if (!Number.isNaN(fromDate.getTime())) {
        rangeParams.from = fromDate.toISOString();
      }
    }
    const toIso = formatRangeEnd(toRaw);
    if (toIso) rangeParams.to = toIso;
    const statusParam = statusFilter && statusFilter !== "all" ? statusFilter : undefined;

    let cacheHit = false;
    const ordersClient = getOrdersClient({
      supabase,
      metrics: {
        log: (event, meta) => {
          if (event === "orders.list.cache_hit") {
            cacheHit = Boolean(meta?.hit);
          }
        },
      },
    });
    const cacheInfo = ordersClient.getCacheMetadata();

    const sdkResult = await ordersClient.listOrdersByDate({
      userId: user.id,
      from: rangeParams.from,
      to: rangeParams.to,
      status: statusParam,
      q: query ?? undefined,
      sort: sort.column === "amount_total" ? "amount_total" : "created_at",
      dir: sort.ascending ? "asc" : "desc",
      cursor: cursorParam,
      limit,
    });

    const orderIds = sdkResult.items.map((item) => item.id);
    let paymentsMap = new Map<
      string,
      {
        id: string;
        status: string;
        amount: number;
        created_at: string;
        currency: string | null;
      }
    >();

    if (orderIds.length) {
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("id, order_id, status, amount, currency, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false });

      if (!paymentsError && Array.isArray(payments)) {
        paymentsMap = payments.reduce((acc, row: any) => {
          const orderId = String(row.order_id);
          if (!acc.has(orderId)) {
            acc.set(orderId, {
              id: String(row.id),
              status: String(row.status || ""),
              amount: toNumber(row.amount),
              currency: row.currency ?? null,
              created_at: String(row.created_at || new Date().toISOString()),
            });
          }
          return acc;
        }, paymentsMap);
      }
    }

    const items = sdkResult.items.map((summary) => ({
      id: summary.id,
      created_at: summary.createdAt,
      amount_total: summary.total,
      amount_subtotal: summary.subtotal,
      amount_discounts: summary.discount,
      amount_tax: summary.tax,
      currency: summary.currency,
      status: summary.status,
      payment_status: summary.paymentStatus,
      payment: paymentsMap.get(summary.id) ?? null,
    }));

    const tookMs = Date.now() - started;

    return json({
      ok: true,
      source: "sdk",
      items,
      count: sdkResult.total ?? items.length,
      next_cursor: sdkResult.nextCursor ?? null,
      meta: {
        cursor: cursorParam ?? undefined,
        limit,
        hasMore: sdkResult.hasMore,
        sort: sort.column === "amount_total" ? "amount_total" : "created_at",
        dir: sort.ascending ? "asc" : "desc",
        tookMs,
        cache: {
          hit: cacheHit,
          adapter: cacheInfo.adapter,
          ttlMs: cacheInfo.ttlMs,
        },
      },
    });
  } catch (error) {
    return json({ ok: false, code: "internal", message: String((error as Error)?.message ?? error) }, 500);
  }
}
