"use client";;
import { mutedTextXs } from "@/styles/classnames";

import Link from "next/link";
import Button from "@ui/components/common/button";
import StatusBadge from "@ui/components/admin/StatusBadge";
import { toast } from "@ui/components/common/toast";
import { callPayments, forceCancelOrder } from "./orders-api";

const FORCE_CANCEL_DISABLED_STATUSES = new Set(["cancelled", "canceled", "refunded", "succeeded", "paid", "fulfilled"]);
const FORCE_CANCEL_CONFIRM_MESSAGE =
  "Stripe \u0435\u0449\u0451 \u043d\u0435 \u0434\u0430\u043b \u0444\u0438\u043d\u0430\u043b\u044c\u043d\u044b\u0439 \u043e\u0442\u0432\u0435\u0442, \u0430\u0434\u043c\u0438\u043d \u043e\u0442\u043c\u0435\u043d\u044f\u0435\u0442 \u0432\u0440\u0443\u0447\u043d\u0443\u044e. \u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c?";
const FORCE_CANCEL_SUCCESS_MESSAGE =
  "\u0417\u0430\u043a\u0430\u0437 \u043f\u0440\u0438\u043d\u0443\u0434\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u043e\u0442\u043c\u0435\u043d\u0451\u043d";

export interface Payment { id: string; status: string; amount: number; currency: string | null; created_at: string }
export interface OrderRow {
  id: string;
  created_at: string;
  amount_total: number;
  currency: string;
  status: string;
  payment_status: string | null;
  payment: Payment | null;
}

function formatCurrency(amount: number, currency: string | null | undefined) {
  const cur = (currency || "EUR").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}

export default function OrdersTable({
  orders,
  total,
  page,
  totalPages,
  setPage,
  token,
  onOrdersChange,
  onRefresh,
}: {
  orders: OrderRow[];
  total: number;
  page: number;
  totalPages: number;
  setPage: (updater: (prev: number) => number) => void;
  token: string;
  onOrdersChange: (updater: (prev: OrderRow[]) => OrderRow[]) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4">Заказ</th>
              <th className="py-2 pr-4">Создан</th>
              <th className="py-2 pr-4">Статус</th>
              <th className="py-2 pr-4">Сумма</th>
              <th className="py-2 pr-4">Платёж</th>
              <th className="py-2 pr-4">Действия</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const payment = order.payment;
              const formattedTotal = formatCurrency(order.amount_total, order.currency);
              const statusLower = (order.status || "").toLowerCase();
              const canForceCancel = !FORCE_CANCEL_DISABLED_STATUSES.has(statusLower);
              return (
                <tr key={order.id} className="border-b border-border/20 align-top">
                  <td className="py-3 pr-4 font-mono text-xs">
                    <div>{order.id}</div>
                    <Link className="text-xs text-primary underline" href={`/admin/orders/${order.id}`}>
                      Подробнее
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-sm">{new Date(order.created_at).toLocaleString()}</td>
                  <td className="py-3 pr-4 text-sm">
                    <StatusBadge status={order.status} />
                    {order.payment_status ? (
                      <div className={mutedTextXs}>Платёж: {order.payment_status}</div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-sm">{formattedTotal}</td>
                  <td className="py-3 pr-4 text-sm">
                    <div className="space-y-1">
                      {payment ? (
                        <>
                          <div className={mutedTextXs}>ID платежа: {payment.id}</div>
                          <div className={mutedTextXs}>
                            Сумма: {payment.amount} {payment.currency}
                          </div>
                        </>
                      ) : (
                        <span className={mutedTextXs}>—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {!payment ? (
                        <Button
                          variant="neutral"
                          className="h-9 min-h-0 px-3 text-xs"
                          onClick={async () => {
                            try {
                              await callPayments("/create", { order_id: order.id }, token);
                              onRefresh();
                            } catch (err) {
                              toast(err instanceof Error ? err.message : String(err), { variant: "error" });
                            }
                          }}
                        >
                          Создать платёж
                        </Button>
                      ) : null}
                      {payment ? (
                        <>
                          <Button
                            variant="neutral"
                            className="h-9 min-h-0 px-3 text-xs"
                            onClick={async () => {
                              try {
                                await callPayments("/webhook", { payment_id: payment.id, status: "succeeded" }, token);
                                onOrdersChange((prev) =>
                                  prev.map((item) =>
                                    item.id === order.id
                                      ? { ...item, payment: { ...(item.payment as Payment), status: "succeeded" } }
                                      : item,
                                  ),
                                );
                                onRefresh();
                              } catch (err) {
                                toast(err instanceof Error ? err.message : String(err), { variant: "error" });
                              }
                            }}
                          >
                            Отметить успешным
                          </Button>
                          <Button
                            variant="neutral"
                            className="h-9 min-h-0 px-3 text-xs text-amber-600 hover:text-white"
                            onClick={async () => {
                              try {
                                await callPayments("/webhook", { payment_id: payment.id, status: "failed" }, token);
                                onOrdersChange((prev) =>
                                  prev.map((item) =>
                                    item.id === order.id
                                      ? { ...item, payment: { ...(item.payment as Payment), status: "failed" } }
                                      : item,
                                  ),
                                );
                                onRefresh();
                              } catch (err) {
                                toast(err instanceof Error ? err.message : String(err), { variant: "error" });
                              }
                            }}
                          >
                            Пометить с ошибкой
                          </Button>
                          {/* Кнопка возврата доступна для paid/fulfilled */}
                          {(/^(paid|fulfilled)$/i).test(order.status) ? (
                            <Button
                              variant="neutral"
                              className="h-9 min-h-0 px-3 text-xs text-indigo-600 hover:text-white"
                              onClick={async () => {
                                try {
                                  const amountStr = window.prompt(
                                    `Сумма возврата в ${order.currency.toUpperCase()} (пусто = полный)`,
                                    "",
                                  );
                                  let amount_cents: number | undefined = undefined;
                                  if (amountStr && amountStr.trim()) {
                                    const parsed = Number(amountStr.replace(",", "."));
                                    if (!(parsed > 0)) {
                                      toast("Некорректная сумма", { variant: "error" });
                                      return;
                                    }
                                    amount_cents = Math.round(parsed * 100);
                                  }
                                  const reason = window.prompt(
                                    "Причина возврата (duplicate/fraudulent/requested_by_customer/другое)",
                                    "requested_by_customer",
                                  ) || undefined;
                                  await callPayments("/refund", { order_id: order.id, amount_cents, reason }, token);
                                  toast("Возврат создан", { variant: "success" });
                                  onRefresh();
                                } catch (err) {
                                  toast(err instanceof Error ? err.message : String(err), { variant: "error" });
                                }
                              }}
                            >
                              Возврат
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                      {canForceCancel ? (
                        <Button
                          variant="neutral"
                          className="h-9 min-h-0 px-3 text-xs text-rose-600 hover:text-white"
                          onClick={async () => {
                            const confirmed = window.confirm(FORCE_CANCEL_CONFIRM_MESSAGE);
                            if (!confirmed) return;
                            try {
                              await forceCancelOrder(order.id, token);
                              toast(FORCE_CANCEL_SUCCESS_MESSAGE, { variant: "success" });
                              onOrdersChange((prev) =>
                                prev.map((item) =>
                                  item.id === order.id
                                    ? {
                                        ...item,
                                        status: "cancelled",
                                        payment_status: "cancelled",
                                        payment: item.payment
                                          ? { ...(item.payment as Payment), status: "canceled" }
                                          : item.payment,
                                      }
                                    : item,
                                ),
                              );
                              onRefresh();
                            } catch (err) {
                              toast(err instanceof Error ? err.message : String(err), { variant: "error" });
                            }
                          }}
                        >
                          Принудительно отменить
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div>
          Показано {orders.length} из {total.toLocaleString()} заказов
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-8 px-3"
            disabled={page <= 1}
            onClick={() => setPage((v) => Math.max(1, v - 1))}
          >
            Назад
          </Button>
          <span>
            Страница {page} из {totalPages.toLocaleString()}
          </span>
          <Button
            variant="ghost"
            className="h-8 px-3"
            disabled={page >= totalPages}
            onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
          >
            Вперёд
          </Button>
        </div>
      </div>
    </div>
  );
}
