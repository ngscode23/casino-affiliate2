"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import Section from "@ui/components/common/section";
import Skeleton from "@ui/components/common/skeleton";
import { toast } from "@ui/components/common/toast";
import {
  cancelOrder,
  confirmPayment,
  getOrder,
  getProductsByIds,
  listOrders,
  type OrderListItem,
} from "@shared/ecom/api/client";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Все" },
  { value: "pending", label: "Ожидает" },
  { value: "processing", label: "В обработке" },
  { value: "succeeded", label: "Оплачен" },
  { value: "failed", label: "Ошибка" },
  { value: "cancelled", label: "Отменён" },
];

type OrderDetail = Awaited<ReturnType<typeof getOrder>>;

type PaymentState = {
  [orderId: string]: "pay" | "cancel" | null;
};

function statusLabel(value: string | null | undefined) {
  const normalized = (value ?? "").toLowerCase();
  switch (normalized) {
    case "pending":
      return "Ожидает";
    case "processing":
      return "В обработке";
    case "succeeded":
      return "Оплачен";
    case "failed":
      return "Ошибка";
    case "cancelled":
      return "Отменён";
    case "requires_action":
      return "Требует действия";
    case "authorized":
      return "Авторизован";
    default:
      return value || "—";
  }
}

function statusClass(value: string | null | undefined) {
  const normalized = (value ?? "").toLowerCase();
  switch (normalized) {
    case "pending":
      return "bg-amber-500/10 text-amber-300 border border-amber-500/30";
    case "processing":
    case "authorized":
      return "bg-sky-500/10 text-sky-200 border border-sky-500/30";
    case "succeeded":
      return "bg-emerald-500/10 text-emerald-200 border border-emerald-500/30";
    case "failed":
    case "cancelled":
      return "bg-rose-500/10 text-rose-200 border border-rose-500/30";
    case "requires_action":
      return "bg-purple-500/10 text-purple-200 border border-purple-500/30";
    default:
      return "bg-white/10 text-white border border-white/20";
  }
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  } catch {
    return `${value?.toFixed?.(2) ?? "0.00"} ${currency}`;
  }
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function OrdersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusParam = searchParams.get("status") ?? "";
  const queryParam = searchParams.get("q") ?? "";
  const pageParam = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const pageSizeParam = Number.parseInt(searchParams.get("page_size") ?? "10", 10);

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? Math.min(pageSizeParam, 100) : 10;

  const [statusFilter, setStatusFilter] = useState(statusParam);
  const [searchValue, setSearchValue] = useState(queryParam);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
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
    (updates: Record<string, string | number | null | undefined>, { resetPage = false } = {}) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      if (resetPage) {
        next.delete("page");
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
        page,
        page_size: pageSize,
      });
      setOrders(response.items);
      setTotal(response.count ?? response.items.length);
      setExpanded({});
      setDetails({});
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, queryParam, statusParam]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const totalPages = useMemo(() => {
    if (!total) return 1;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const onSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      updateParams({ q: searchValue || null }, { resetPage: true });
    },
    [searchValue, updateParams],
  );

  const onStatusChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextStatus = event.target.value;
      setStatusFilter(nextStatus);
      updateParams({ status: nextStatus || null }, { resetPage: true });
    },
    [updateParams],
  );

  const onPageChange = useCallback(
    (nextPage: number) => {
      const clamped = Math.min(Math.max(1, nextPage), totalPages);
      updateParams({ page: clamped }, {});
    },
    [totalPages, updateParams],
  );

  const onPageSizeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextSize = Number.parseInt(event.target.value, 10) || 10;
      updateParams({ page_size: nextSize }, { resetPage: true });
    },
    [updateParams],
  );

  const toggleOrder = useCallback(
    async (orderId: string) => {
      setExpanded((prev) => ({ ...prev, [orderId]: !prev[orderId] }));

      if (details[orderId]) return;

      try {
        const detail = await getOrder(orderId);
        setDetails((prev) => ({ ...prev, [orderId]: detail }));

        const productIds = Array.from(
          new Set(
            detail.items
              .map((item) => item.product_id)
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
        toast(message || "Не удалось загрузить заказ", { variant: "error" });
      }
    },
    [details, slugMap],
  );

  const performCancel = useCallback(
    async (orderId: string) => {
      try {
        setPendingMap((prev) => ({ ...prev, [orderId]: "cancel" }));
        await cancelOrder(orderId);
        toast("Заказ отменён", { variant: "success" });
        await fetchOrders();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast(message || "Не удалось отменить заказ", { variant: "error" });
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
          toast("Требуется подтверждение 3DS", { variant: "info" });
          window.open(response.next_action.url, "_blank", "noopener,noreferrer");
        } else {
          toast("Оплата выполнена", { variant: "success" });
        }
        await fetchOrders();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast(message || "Не удалось подтвердить оплату", { variant: "error" });
      } finally {
        setPendingMap((prev) => ({ ...prev, [orderId]: null }));
      }
    },
    [fetchOrders],
  );

  const isLoading = loading && orders.length === 0;

  return (
    <Section className="py-10">
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm shadow-md backdrop-blur sm:flex-row sm:items-end sm:justify-between">
        <form onSubmit={onSearchSubmit} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1 sm:w-56">
            <label htmlFor="status" className="text-xs uppercase text-white/60">
              Статус
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={onStatusChange}
              className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="order-search" className="text-xs uppercase text-white/60">
              Поиск по номеру заказа
            </label>
            <div className="flex gap-2">
              <input
                id="order-search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Например, acme-order-001"
                className="h-10 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-90"
              >
                Найти
              </button>
            </div>
          </div>
        </form>
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase text-white/60" htmlFor="orders-page-size">
            На странице
          </label>
          <select
            id="orders-page-size"
            value={String(pageSize)}
            onChange={onPageSizeChange}
            className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-black/40 p-6 text-sm text-white/70">
          Заказы не найдены.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-left text-white/70">
              <tr>
                <th className="px-4 py-3 font-medium">Заказ</th>
                <th className="px-4 py-3 font-medium">Создан</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Сумма</th>
                <th className="px-4 py-3 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const orderId = order.id;
                const isOpen = !!expanded[orderId];
                const detail = details[orderId];
                const paymentState = pendingMap[orderId];
                const canPay = order.status === "pending" || order.status === "processing";
                const canCancel = order.status === "pending";

                return (
                  <Fragment key={orderId}>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3 font-medium text-white">{orderId}</td>
                      <td className="px-4 py-3 text-white/70">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusClass(order.status)}`}>
                            {statusLabel(order.status)}
                          </span>
                          {order.payment_status ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusClass(order.payment_status)}`}
                            >
                              {statusLabel(order.payment_status)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/80">
                        {formatCurrency(order.amount_total ?? 0, order.currency || "EUR")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void toggleOrder(orderId)}
                            className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white transition hover:bg-white/10"
                          >
                            {isOpen ? "Скрыть" : detail ? `Позиции (${detail.items.length})` : "Показать"}
                          </button>
                          {canPay ? (
                            <button
                              type="button"
                              onClick={() => void performPayment(orderId)}
                              disabled={paymentState === "pay"}
                              className="rounded-lg border border-emerald-500/40 px-3 py-1 text-xs text-emerald-200 transition hover:bg-emerald-500/10 disabled:opacity-50"
                            >
                              {paymentState === "pay" ? "Оплата..." : "Оплатить"}
                            </button>
                          ) : null}
                          {canCancel ? (
                            <button
                              type="button"
                              onClick={() => void performCancel(orderId)}
                              disabled={paymentState === "cancel"}
                              className="rounded-lg border border-rose-500/40 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-500/10 disabled:opacity-50"
                            >
                              {paymentState === "cancel" ? "Отмена..." : "Отменить"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr className="border-b border-white/10 bg-black/30">
                        <td colSpan={5} className="px-4 py-4">
                          {!detail ? (
                            <div className="text-xs text-white/60">Загрузка деталей заказа...</div>
                          ) : detail.items.length === 0 ? (
                            <div className="text-xs text-white/60">Позиции заказа отсутствуют.</div>
                          ) : (
                            <div className="space-y-3">
                              <div className="text-xs text-white/60">Позиций: {detail.items.length}</div>
                              <ul className="space-y-2">
                                {detail.items.map((item) => {
                                  const productId = item.product_id ? String(item.product_id) : "";
                                  const slug = productId ? slugMap[productId] : undefined;
                                  const quantity = item.qty ?? 1;
                                  const unit = formatCurrency(item.unit_price ?? 0, detail.order.currency);
                                  const totalAmount = formatCurrency(item.total ?? item.unit_price ?? 0, detail.order.currency);
                                  return (
                                    <li key={`${orderId}-${productId}-${item.id}`} className="flex flex-col gap-1 rounded-lg border border-white/15 bg-black/40 p-3 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between">
                                      <div>
                                        {slug ? (
                                          <Link href={`/products/${slug}`} className="font-medium text-white hover:underline">
                                            {item.title || productId}
                                          </Link>
                                        ) : (
                                          <span className="font-medium text-white">{item.title || productId || "Товар"}</span>
                                        )}
                                        <div className="text-xs text-white/50">Количество: {quantity} × {unit}</div>
                                      </div>
                                      <div className="text-sm font-medium text-white">{totalAmount}</div>
                                    </li>
                                  );
                                })}
                              </ul>
                              <div className="flex flex-col items-end gap-1 text-sm text-white/80">
                                <div>
                                  Подытог: {formatCurrency(detail.order.amount_subtotal ?? 0, detail.order.currency)}
                                </div>
                                <div>
                                  Скидки: {formatCurrency(detail.order.amount_discounts ?? 0, detail.order.currency)}
                                </div>
                                <div>
                                  Налоги / доставка: {formatCurrency(detail.order.amount_tax ?? 0, detail.order.currency)}
                                </div>
                                <div className="text-base font-semibold text-white">
                                  Итого: {formatCurrency(detail.order.amount_total ?? 0, detail.order.currency)}
                                </div>
                                {detail.payment ? (
                                  <div className="text-xs text-white/60">
                                    Оплата: {statusLabel(detail.payment.status)}
                                    {detail.payment.amount
                                      ? ` • ${formatCurrency(
                                          detail.payment.amount,
                                          detail.payment.currency || detail.order.currency,
                                        )}`
                                      : ""}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {orders.length > 0 ? (
        <div className="mt-6 flex items-center justify-between text-xs text-white/60">
          <div>
            Страница {page} из {totalPages} • Всего {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/15 px-3 py-1 text-white transition hover:bg-white/10 disabled:opacity-40"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Назад
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/15 px-3 py-1 text-white transition hover:bg-white/10 disabled:opacity-40"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Вперёд
            </button>
          </div>
        </div>
      ) : null}
    </Section>
  );
}