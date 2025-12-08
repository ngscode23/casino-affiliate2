import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  cancelOrder,
  confirmPayment,
  getOrder,
  getProductsByIds,
  listOrders,
} from "@shared/ecom/api/client";
import type { OrderListItem as OrderListItemDto } from "@shared/ecom/api/client";
import type { CartItem, OrderDetail, OrderListItem, PaymentStatus } from "@/types/domain";
import { sanitizeSearchParam } from "@shared/lib/sanitize";
import { toast } from "@ui/components/common/toast";

const CANCELLABLE_PAYMENT_STATUSES = new Set(["", "failed", "canceled", "cancelled"]);

type OrderDetailDto = Awaited<ReturnType<typeof getOrder>>;

type PaymentState = {
  [orderId: string]: "pay" | "cancel" | null;
};

function toCents(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

function normalizePaymentStatus(value: string | null | undefined): PaymentStatus | null {
  const normalized = (value ?? "").toLowerCase();
  const allowed: PaymentStatus[] = [
    "pending",
    "succeeded",
    "failed",
    "authorized",
    "captured",
    "paid",
    "canceled",
    "refunded",
    "partial_refund",
    "requires_action",
  ];
  return allowed.includes(normalized as PaymentStatus) ? (normalized as PaymentStatus) : null;
}

function normalizeOrderStatus(value: string | null | undefined): OrderListItem["status"] {
  const normalized = (value ?? "").toLowerCase();
  switch (normalized) {
    case "processing":
      return "processing";
    case "paid":
    case "succeeded":
      return "paid";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "refunded":
      return "refunded";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

function normalizeOrderRow(row: OrderListItemDto): OrderListItem {
  const createdAt =
    typeof row.created_at === "string" && row.created_at ? row.created_at : new Date().toISOString();
  return {
    id: String(row.id ?? ""),
    createdAt,
    status: normalizeOrderStatus(row.status),
    paymentStatus: normalizePaymentStatus(row.payment_status),
    totalCents: toCents(row.amount_total ?? 0),
    currency: ((row.currency ?? "EUR") as string).toUpperCase(),
  };
}

function normalizeOrderDetail(dto: OrderDetailDto): OrderDetail {
  const order = normalizeOrderRow({
    id: dto.order.id,
    created_at: dto.order.created_at,
    amount_total: dto.order.amount_total,
    currency: dto.order.currency,
    status: dto.order.status,
    payment_status: dto.order.payment_status,
  } as OrderListItemDto);

  const items: CartItem[] = (dto.items ?? []).map((item, index) => {
    const quantity = Number(item.qty ?? 0);
    const unitCents = toCents(item.unit_price ?? item.total ?? 0);
    return {
      id: item.id ? String(item.id) : `${order.id}-${index}`,
      productId: item.product_id ?? "",
      quantity,
      priceCents: unitCents,
      currency: order.currency,
      title: item.title ?? item.product_id ?? "Item",
      thumbnail: null,
      sku: null,
    };
  });

  const payment =
    dto.payment && dto.payment.status
      ? {
          status: normalizePaymentStatus(dto.payment.status) ?? "pending",
          amountCents: toCents(dto.payment.amount ?? 0),
          currency: (dto.payment.currency ?? order.currency) as string,
          provider: dto.payment.provider ?? null,
          providerRef: dto.payment.provider_ref ?? null,
        }
      : null;

  return {
    ...order,
    items,
    subtotalCents: toCents(dto.order.amount_subtotal ?? dto.order.amount_total ?? 0),
    discountCents: toCents(dto.order.amount_discounts ?? 0),
    taxCents: toCents(dto.order.amount_tax ?? 0),
    payment,
  };
}

export type UseOrdersResult = {
  statusFilter: string;
  searchValue: string;
  setSearchValue: (value: string) => void;
  limit: number;
  orders: OrderListItem[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
  loading: boolean;
  error: string | null;
  expanded: Record<string, boolean>;
  details: Record<string, OrderDetail | null>;
  pendingMap: PaymentState;
  slugMap: Record<string, string>;
  sectionStatus: "loading" | "error" | "success";
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onStatusSelect: (value: string) => void;
  onPageSizeSelect: (value: number) => void;
  onLoadMore: () => void;
  onResetCursor: () => void;
  toggleOrder: (orderId: string) => Promise<void>;
  performCancel: (orderId: string) => Promise<void>;
  performPayment: (orderId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
};

export function useOrders(): UseOrdersResult {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusParam = searchParams.get("status") ?? "";
  const queryParam = sanitizeSearchParam(searchParams.get("q"));
  const cursorParam = searchParams.get("cursor");
  const limitParam = Number.parseInt(searchParams.get("page_size") ?? searchParams.get("limit") ?? "10", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 10;

  const [statusFilter, setStatusFilter] = useState(statusParam);
  const [searchValue, setSearchValue] = useState(queryParam);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<Record<string, OrderDetail | null>>({});
  const [pendingMap, setPendingMap] = useState<PaymentState>({});
  const [slugMap, setSlugMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setStatusFilter(statusParam);
  }, [statusParam]);

  useEffect(() => {
    setSearchValue(queryParam);
  }, [queryParam]);

  const updateParams = useCallback(
    (updates: Record<string, string | number | null | undefined>, { resetCursor = false } = {}) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      if (resetCursor) {
        next.delete("cursor");
      }
      const search = next.toString();
      router.replace(search ? `?${search}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listOrders({
        status: statusParam || undefined,
        q: queryParam || undefined,
        sort: "created_at desc",
        cursor: cursorParam || undefined,
        page_size: limit,
      });
      const normalizedItems = response.items.map(normalizeOrderRow);
      setOrders((prev) => {
        if (!cursorParam) {
          return normalizedItems;
        }
        return [...prev, ...normalizedItems];
      });
      setTotal(response.count ?? normalizedItems.length);
      setHasMore(Boolean(response.hasMore));
      setNextCursor(response.nextCursor ?? null);
      if (!cursorParam) {
        setExpanded({});
        setDetails({});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "We couldn't load your orders.");
    } finally {
      setLoading(false);
    }
  }, [cursorParam, limit, queryParam, statusParam]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const sectionStatus = useMemo<UseOrdersResult["sectionStatus"]>(() => {
    if (loading && orders.length === 0) return "loading";
    if (error) return "error";
    return "success";
  }, [error, loading, orders.length]);

  const onSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      updateParams({ q: searchValue || null }, { resetCursor: true });
    },
    [searchValue, updateParams],
  );

  const onStatusSelect = useCallback(
    (nextStatus: string) => {
      if (nextStatus === statusFilter) return;
      setStatusFilter(nextStatus);
      updateParams({ status: nextStatus || null }, { resetCursor: true });
    },
    [statusFilter, updateParams],
  );

  const onPageSizeSelect = useCallback(
    (nextSize: number) => {
      if (nextSize === limit) return;
      updateParams({ page_size: nextSize }, { resetCursor: true });
    },
    [limit, updateParams],
  );

  const onLoadMore = useCallback(() => {
    if (nextCursor) {
      updateParams({ cursor: nextCursor });
    }
  }, [nextCursor, updateParams]);

  const onResetCursor = useCallback(() => {
    updateParams({ cursor: null }, { resetCursor: true });
  }, [updateParams]);

  const toggleOrder = useCallback(
    async (orderId: string) => {
      setExpanded((prev) => ({ ...prev, [orderId]: !prev[orderId] }));

      if (details[orderId]) return;

      try {
        const detailDto = await getOrder(orderId);
        const detail = normalizeOrderDetail(detailDto);
        setDetails((prev) => ({ ...prev, [orderId]: detail }));

        const productIds = Array.from(
          new Set(
            detail.items
              .map((item) => item.productId)
              .filter((pid): pid is string => typeof pid === "string" && pid.trim().length > 0),
          ),
        ).filter((pid) => !slugMap[pid]);

        if (productIds.length) {
          const products = await getProductsByIds(productIds);
          if (products.length) {
            setSlugMap((prev) => {
              const next = { ...prev };
              for (const product of products) {
                if (product.id && product.slug) {
                  next[String(product.id)] = product.slug;
                }
              }
              return next;
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast(message || "We couldn't load the order.", { variant: "error" });
      }
    },
    [details, slugMap],
  );

  const performCancel = useCallback(
    async (orderId: string) => {
      try {
        setPendingMap((prev) => ({ ...prev, [orderId]: "cancel" }));
        await cancelOrder(orderId);
        toast("Order cancelled.", { variant: "success" });
        await fetchOrders();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (typeof message === "string" && message.toLowerCase().includes("payment_in_progress")) {
          toast("Payment is still being processed. Please wait for the result.", { variant: "info" });
        } else if (typeof message === "string" && message.toLowerCase().includes("cannot_cancel_in_this_status")) {
          toast("We can't cancel this order right now.", { variant: "info" });
        } else {
          toast(message || "We couldn't cancel the order.", { variant: "error" });
        }
      } finally {
        setPendingMap((prev) => ({ ...prev, [orderId]: null }));
      }
    },
    [fetchOrders],
  );

  const performPayment = useCallback(
    async (orderId: string) => {
      try {
        setPendingMap((prev) => ({ ...prev, [orderId]: "pay" }));
        const response = await confirmPayment(orderId);
        if (response?.next_action?.url) {
          toast("Additional 3DS verification required.", { variant: "info" });
          window.open(response.next_action.url, "_blank", "noopener,noreferrer");
        } else {
          toast("Payment completed.", { variant: "success" });
        }
        await fetchOrders();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast(message || "We couldn't confirm the payment.", { variant: "error" });
      } finally {
        setPendingMap((prev) => ({ ...prev, [orderId]: null }));
      }
    },
    [fetchOrders],
  );

  const onRefresh = useCallback(async () => fetchOrders(), [fetchOrders]);

  return {
    statusFilter,
    searchValue,
    setSearchValue,
    limit,
    orders,
    total,
    hasMore,
    nextCursor,
    loading,
    error,
    expanded,
    details,
    pendingMap,
    slugMap,
    sectionStatus,
    onSearchSubmit,
    onStatusSelect,
    onPageSizeSelect,
    onLoadMore,
    onResetCursor,
    toggleOrder,
    performCancel,
    performPayment,
    onRefresh,
  };
}

export { CANCELLABLE_PAYMENT_STATUSES };
