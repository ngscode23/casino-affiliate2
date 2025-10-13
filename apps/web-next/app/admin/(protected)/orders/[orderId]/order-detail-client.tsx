
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Skeleton from "@ui/components/common/skeleton";
import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import StatusBadge from "@ui/components/admin/StatusBadge";
import { toast } from "@ui/components/common/toast";
import { getValidAccessToken } from "@shared/lib/auth";

const DEFAULT_ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "";

interface OrderDetail {
  id: string;
  user_id: string | null;
  created_at: string;
  amount_subtotal: number;
  amount_discounts: number;
  amount_tax: number;
  amount_total: number;
  currency: string;
  status: string;
  payment_status: string | null;
}

interface OrderItemRow {
  id: string;
  product_id: string | null;
  title: string | null;
  qty: number;
  unit_price: number;
  total: number;
}

interface PaymentRow {
  id: string;
  status: string;
  amount: number;
  currency: string | null;
  provider: string | null;
  provider_ref: string | null;
  created_at: string;
}

interface RefundRow {
  refund_id: string;
  amount_cents: number;
  currency: string | null;
  reason: string | null;
  created_at: string;
}

interface HistoryRow {
  id: string;
  from_status: string | null;
  to_status: string | null;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}


function useAdminToken() {
  const [token, setToken] = useState("");

  useEffect(() => {
    let initial = DEFAULT_ADMIN_TOKEN ?? "";
    try {
      const stored = window.localStorage.getItem("admin:token");
      if (stored) initial = stored;
    } catch {
      // ignore storage access issues
    }
    setToken(initial);
  }, []);

  const save = (value: string) => {
    setToken(value);
    try {
      window.localStorage.setItem("admin:token", value);
    } catch {
      // ignore storage access issues
    }
  };

  return { token, setToken: save };
}

async function authorizedRequest(path: string, adminToken: string, init: RequestInit = {}) {
  const accessToken = await getValidAccessToken();

  const headers = new Headers(init.headers || {});
  headers.set("accept", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (adminToken) headers.set("x-admin-token", adminToken);

  return fetch(path, { ...init, headers, cache: "no-store" });
}
function formatCurrency(amount: number, currency: string | null | undefined) {
  const cur = (currency || "EUR").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const { token, setToken } = useAdminToken();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [resyncing, setResyncing] = useState(false);
  const [resyncError, setResyncError] = useState<string | null>(null);
  const [resyncMessage, setResyncMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await authorizedRequest(
          `/api/admin/orders/${encodeURIComponent(orderId)}`,
          token,
        );
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const json = await response.json();
        if (json?.ok === false) {
          throw new Error(String(json?.message || json?.error || "Failed to load order"));
        }
        if (!cancelled) {
          setOrder(json.order as OrderDetail);
          setItems(Array.isArray(json.items) ? (json.items as OrderItemRow[]) : []);
          setPayments(Array.isArray(json.payments) ? (json.payments as PaymentRow[]) : []);
          setHistory(Array.isArray(json.statusHistory) ? (json.statusHistory as HistoryRow[]) : []);
          setRefunds(Array.isArray(json.refunds) ? (json.refunds as RefundRow[]) : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, token, refreshToken]);

  const refundTotalCents = useMemo(
    () => refunds.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0),
    [refunds]
  );

  const refundAmountLabel = useMemo(() => {
    if (refundTotalCents <= 0 || !order) return null;
    const currency = refunds[0]?.currency || order.currency;
    return formatCurrency(refundTotalCents / 100, currency);
  }, [refundTotalCents, refunds, order]);

  const totals = order
    ? [
        { label: "Subtotal", value: formatCurrency(order.amount_subtotal, order.currency) },
        { label: "Discounts", value: formatCurrency(order.amount_discounts, order.currency) },
        { label: "Tax & shipping", value: formatCurrency(order.amount_tax, order.currency) },
        { label: "Total", value: formatCurrency(order.amount_total, order.currency) },
      ]
    : [];

  const handleRefresh = () => {
    setRefreshToken((value) => value + 1);
    setResyncMessage(null);
    setResyncError(null);
    toast("Reloading order", { variant: "success" });
  };

  const handleResync = async () => {
    if (!order) return;
    try {
      setResyncing(true);
      setResyncError(null);
      setResyncMessage(null);
      const response = await authorizedRequest(
        "/api/payments/resync",
        token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ order_id: order.id }),
        }
      );

      let payload: any = null;
      try {
        payload = await response.clone().json();
      } catch {
        payload = null;
      }
      if (!payload) {
        const textBody = await response.text().catch(() => "");
        if (textBody) payload = { message: textBody };
      }

      if (response.status === 202) {
        setResyncMessage(
          payload?.reason || payload?.message || "Resync queued for manual review."
        );
        return;
      }

      if (!response.ok) {
        if (
          response.status === 403 &&
          (payload?.code === "admin_sim_ip_forbidden" || payload?.code === "forbidden")
        ) {
          setResyncError(
            "Access denied (IP not allowed). Add your IP to ADMIN_SIM_ALLOWED_IPS and try again."
          );
        } else {
          setResyncError(payload?.message || payload?.error || `Resync failed (${response.status})`);
        }
        return;
      }

      setResyncMessage(
        payload?.payment_status
          ? `Synced payment status: ${payload.payment_status}`
          : "Stripe resync completed."
      );
      setRefreshToken((value) => value + 1);
    } catch (err) {
      setResyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setResyncing(false);
    }
  };

  return (
    <Section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="text-sm text-primary underline">
          Back to orders
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <label className="text-muted-foreground" htmlFor="admin-token-input">
            Admin token
          </label>
          <Input
            id="admin-token-input"
            value={token}
            onChange={(event) => setToken(event.currentTarget.value)}
            placeholder="x-admin-token"
            className="h-9 w-60"
          />
          <Button variant="ghost" className="h-9" onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ) : error ? (
        <Card className="p-4 text-sm text-rose-500">{error}</Card>
      ) : !order ? (
        <Card className="p-4 text-sm text-muted-foreground">Order not found.</Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Order ID</div>
                <div className="font-mono text-sm">{order.id}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div>{new Date(order.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <StatusBadge status={order.status} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Payment status</div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status={order.payment_status ?? "unknown"} />
                  {refundAmountLabel ? (
                    <span className="text-xs text-muted-foreground">Refunded: {refundAmountLabel}</span>
                  ) : null}
                </div>
                {order.payment_status === "requires_action" ? (
                  <div className="text-xs text-amber-300">
                    Stripe reports that additional customer action is required.
                  </div>
                ) : null}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Customer</div>
                <div className="text-sm">{order.user_id || "-"}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-muted-foreground">Stripe sync</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <Button
                    variant="soft"
                    className="h-9 min-h-0 px-3 text-xs"
                    onClick={handleResync}
                    disabled={resyncing}
                  >
                    {resyncing ? "Resyncing..." : "Resync from Stripe"}
                  </Button>
                  {resyncMessage ? (
                    <span className="text-xs text-emerald-300">{resyncMessage}</span>
                  ) : null}
                  {resyncError ? (
                    <span className="text-xs text-rose-400">{resyncError}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-base font-semibold">Totals</h2>
            <dl className="grid gap-2 sm:grid-cols-2">
              {totals.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-base font-semibold">Items</h2>
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground">No items recorded.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4">Product</th>
                      <th className="py-2 pr-4">Qty</th>
                      <th className="py-2 pr-4">Unit price</th>
                      <th className="py-2 pr-4">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-border/20">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{item.title || "Unnamed"}</div>
                          {item.product_id ? (
                            <Link
                              href={`/admin/shop/products/${item.product_id}`}
                              className="text-xs text-primary underline"
                            >
                              Product details
                            </Link>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4 text-sm">{item.qty}</td>
                        <td className="py-3 pr-4 text-sm">
                          {formatCurrency(item.unit_price, order.currency)}
                        </td>
                        <td className="py-3 pr-4 text-sm">
                          {formatCurrency(item.total, order.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Payments</h2>
                <Button variant="ghost" className="h-8 px-3 text-xs" onClick={handleRefresh}>
                  Refresh
                </Button>
              </div>
              {payments.length === 0 ? (
                <div className="mt-3 text-sm text-muted-foreground">No payments recorded.</div>
              ) : (
                <ul className="mt-3 space-y-3 text-sm">
                  {payments.map((payment) => (
                    <li key={payment.id} className="rounded-lg border border-border/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">{payment.id}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(payment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-sm">
                        <StatusBadge status={payment.status} />
                        <span>
                          {formatCurrency(payment.amount, payment.currency || order.currency)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {payment.provider || "provider"}
                        {payment.provider_ref ? ` - ${payment.provider_ref}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Refunds</h2>
              {refunds.length > 0 ? (
                <span className="text-xs text-muted-foreground">Total: {refundAmountLabel ?? "-"}</span>
              ) : null}
            </div>
            {refunds.length === 0 ? (
              <div className="mt-3 text-sm text-muted-foreground">No refunds recorded.</div>
            ) : (
              <ul className="mt-3 space-y-3 text-sm">
                {refunds.map((refund) => (
                  <li key={refund.refund_id} className="rounded-lg border border-border/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">{refund.refund_id}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(refund.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span>{refund.reason || "—"}</span>
                      <span>{formatCurrency(refund.amount_cents / 100, refund.currency || order.currency)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

            <Card className="p-4">
              <h2 className="text-base font-semibold">Status history</h2>
              {history.length === 0 ? (
                <div className="mt-3 text-sm text-muted-foreground">No status changes recorded.</div>
              ) : (
                <ul className="mt-3 space-y-3 text-sm">
                  {history.map((row) => (
                    <li key={row.id} className="rounded-lg border border-border/40 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(row.created_at).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1">
                            {row.from_status ? <StatusBadge status={row.from_status} /> : null}
                            {row.from_status ? <span className="text-muted-foreground">-&gt;</span> : null}
                            <StatusBadge status={row.to_status ?? "unknown"} />
                          </div>
                        </div>
                        {row.changed_by ? (
                          <span className="text-xs text-muted-foreground">{row.changed_by}</span>
                        ) : null}
                      </div>
                      {row.reason ? (
                        <div className="mt-1 text-xs text-muted-foreground">{row.reason}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </Section>
  );
}










