"use client";

import Link from "next/link";
import Button from "@ui/components/common/button";
import StatusBadge from "@ui/components/admin/StatusBadge";
import { toast } from "@ui/components/common/toast";
import { callPayments } from "./orders-api";

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
              <th className="py-2 pr-4">Order</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Payment</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const payment = order.payment;
              const formattedTotal = formatCurrency(order.amount_total, order.currency);
              return (
                <tr key={order.id} className="border-b border-border/20 align-top">
                  <td className="py-3 pr-4 font-mono text-xs">
                    <div>{order.id}</div>
                    <Link className="text-xs text-primary underline" href={`/admin/orders/${order.id}`}>
                      View details
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-sm">{new Date(order.created_at).toLocaleString()}</td>
                  <td className="py-3 pr-4 text-sm">
                    <StatusBadge status={order.status} />
                    {order.payment_status ? (
                      <div className="text-xs text-muted-foreground">Payment: {order.payment_status}</div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-sm">{formattedTotal}</td>
                  <td className="py-3 pr-4 text-sm">
                    <div className="space-y-1">
                      {payment ? (
                        <>
                          <div className="text-xs text-muted-foreground">Payment ID: {payment.id}</div>
                          <div className="text-xs text-muted-foreground">{payment.amount} {payment.currency}</div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {!payment ? (
                        <Button
                          variant="soft"
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
                          Create payment
                        </Button>
                      ) : null}
                      {payment ? (
                        <>
                          <Button
                            variant="soft"
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
                            Mark succeeded
                          </Button>
                          <Button
                            variant="soft"
                            className="h-9 min-h-0 px-3 text-xs"
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
                            Mark failed
                          </Button>
                        </>
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
        <div>Showing {orders.length} of {total.toLocaleString()} orders</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="h-8 px-3" disabled={page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>Previous</Button>
          <span>Page {page} of {totalPages.toLocaleString()}</span>
          <Button variant="ghost" className="h-8 px-3" disabled={page >= totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>Next</Button>
        </div>
      </div>
    </div>
  );
}

