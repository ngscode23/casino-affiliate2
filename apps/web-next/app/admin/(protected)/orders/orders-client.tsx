"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Skeleton from "@ui/components/common/skeleton";
import Input from "@ui/components/common/input";
import Button from "@ui/components/common/button";
import StatusBadge from "@ui/components/admin/StatusBadge";
import { toast } from "@ui/components/common/toast";
import { supabase } from "@shared/lib/supabase";
import OrdersTable from "./OrdersTable";
const LazyOrdersTable = dynamic(() => import("./OrdersTable"), { ssr: false });
import { getValidAccessToken } from "@shared/lib/auth";
import { useDebounce } from "@shared/hooks/useDebounce";

const DEFAULT_ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "";

interface Payment {
  id: string;
  status: string;
  amount: number;
  currency: string | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  created_at: string;
  amount_total: number;
  currency: string;
  status: string;
  payment_status: string | null;
  payment: Payment | null;
}

interface Summary {
  total: number;
  pending: number;
  processing: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  average_check: number;
  failed_share: number;
  conversion: number;
}

function useAdminToken() {
  const [token, setToken] = useState("");

  useEffect(() => {
    let initial = DEFAULT_ADMIN_TOKEN ?? "";
    try {
      const stored = window.localStorage.getItem("admin:token");
      if (stored) initial = stored;
    } catch {
      // ignore storage errors
    }
    setToken(initial);
  }, []);

  const update = (value: string) => {
    setToken(value);
    try {
      window.localStorage.setItem("admin:token", value);
    } catch {
      // ignore storage errors
    }
  };

  return { token, setToken: update };
}

async function authorizedRequest(path: string, adminToken: string, init?: RequestInit) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  const headers = new Headers(init?.headers ?? {});
  headers.set("accept", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (adminToken) headers.set("x-admin-token", adminToken);

  // ensure absolute URL to avoid relative-path resolution issues
  const url = path.startsWith("http") ? path : new URL(path, window.location.origin).toString();

  return fetch(url, { ...init, headers, cache: "no-store" });
}

async function fetchSummary(adminToken: string): Promise<Summary | null> {
  // Попытка через авторизованный запрос (если есть access token)
  try {
    const response = await authorizedRequest("/api/admin/orders?days=30", adminToken);
    if (response.ok) {
      const json = (await response.json()) as Summary & { ok?: boolean };
      if (json?.ok === false) return null;
      return json;
    }
    // если 404/500 — упадём в fallback ниже
  } catch (err) {
    console.warn("authorizedRequest failed for summary, will try fallback:", err);
  }

  // Fallback: прямой fetch с использованием только x-admin-token (если сервер принимает)
  try {
    const url = new URL("/api/admin/orders?days=30", window.location.origin).toString();
    const headers: Record<string, string> = { accept: "application/json" };
    if (adminToken) headers["x-admin-token"] = adminToken;
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as Summary & { ok?: boolean };
    if (json?.ok === false) return null;
    return json;
  } catch (error) {
    console.warn("fetchSummary fallback failed", error);
    return null;
  }
}

interface OrdersQueryParams {
  page: number;
  pageSize: number;
  status?: string;
  q?: string;
  from?: string;
  to?: string;
}

async function fetchOrders(params: OrdersQueryParams, adminToken: string) {
  const url = new URL("/api/admin/orders", window.location.origin);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("pageSize", String(params.pageSize));
  if (params.status && params.status !== "all") {
    url.searchParams.set("status", params.status);
  }
  if (params.q) url.searchParams.set("q", params.q);
  if (params.from) url.searchParams.set("from", params.from);
  if (params.to) url.searchParams.set("to", params.to);

  const response = await authorizedRequest(url.toString(), adminToken);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const json = await response.json();
  if (json?.ok === false) {
    throw new Error(String(json?.message || json?.error || "Failed to load orders"));
  }
  return {
    items: (Array.isArray(json?.items) ? json.items : []) as OrderRow[],
    count: Number(json?.count || 0),
  };
}

async function callPayments(path: string, body: unknown, adminToken: string) {
  const response = await authorizedRequest(`/api/payments${path}`, adminToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `payments ${path} ${response.status}`);
  }
  return response.json();
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

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 25;

export function OrdersClient() {
  const { token, setToken } = useAdminToken();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);

  const debouncedSearch = useDebounce(search, 400);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, from, to]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchSummary(token);
      if (!cancelled) setSummary(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { items, count } = await fetchOrders(
          {
            page,
            pageSize: PAGE_SIZE,
            status,
            q: debouncedSearch ? debouncedSearch : undefined,
            from: from || undefined,
            to: to || undefined,
          },
          token,
        );
        if (!cancelled) {
          setOrders(items);
          setTotal(count);
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
  }, [page, status, debouncedSearch, from, to, token, refreshToken]);

  const summaryCards = useMemo(() => {
    if (!summary) return null;
    return [
      { label: "Orders", value: summary.total.toLocaleString() },
      { label: "Conversion", value: `${summary.conversion.toFixed(2)}%` },
      { label: "Average check", value: formatCurrency(summary.average_check, "EUR") },
      { label: "Failed share", value: `${summary.failed_share.toFixed(2)}%` },
    ];
  }, [summary]);

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setFrom("");
    setTo("");
  };

  const handleRefresh = () => setRefreshToken((value) => value + 1);

  return (
    <Section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
          <label className="text-muted-foreground" htmlFor="admin-token-input">
            Admin token
          </label>
          <Input
            id="admin-token-input"
            value={token}
            onChange={(event) => setToken(event.currentTarget.value)}
            placeholder="x-admin-token"
            className="h-9 w-64"
          />
          <Button variant="ghost" className="h-9" onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_140px_140px]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search by order id..."
          />
          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.currentTarget.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Input type="date" value={from} onChange={(event) => setFrom(event.currentTarget.value)} />
          <Input type="date" value={to} onChange={(event) => setTo(event.currentTarget.value)} />
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <Button variant="ghost" className="h-8 px-3" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </Card>

      {summaryCards ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.label} className="p-4">
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="text-xl font-semibold">{card.value}</div>
            </Card>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ) : error ? (
        <div className="text-sm text-rose-500">{error}</div>
      ) : orders.length === 0 ? (
        <div className="text-sm text-muted-foreground">No orders.</div>
      ) : (
        <div className="space-y-4">
          {/* Defer heavy table to a lazy chunk */}
          <LazyOrdersTable
            orders={orders}
            total={total}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            token={token}
            onOrdersChange={setOrders}
            onRefresh={handleRefresh}
          />
        </div>
      )}
    </Section>
  );
}

/* Legacy table left here for reference (trimmed in favor of LazyOrdersTable) */
/*
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
                      <td className="py-3 pr-4 text-sm">
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        <StatusBadge status={order.status} />
                        {order.payment_status ? (
                          <div className="text-xs text-muted-foreground">Payment: {order.payment_status}</div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-sm">{formattedTotal}</td>
                      <td className="py-3 pr-4 text-xs">
                        {payment ? (
                          <div className="space-y-1">
                            <div className="font-mono">{payment.id}</div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">{payment.status}</span>
                              {" | "}
                              {formatCurrency(Number(payment.amount || 0), payment.currency || order.currency)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="soft"
                            className="h-9 min-h-0 px-3 text-xs"
                            onClick={async () => {
                              try {
                                const result = await callPayments(
                                  "/create",
                                  { order_id: order.id },
                                  token,
                                );
                                toast(`Payment created: ${result.payment_id ?? "ok"}`, {
                                  variant: "success",
                                });
                                const refreshed = await supabase
                                  .from("payments")
                                  .select("id,order_id,status,amount,created_at,currency")
                                  .eq("order_id", order.id)
                                  .order("created_at", { ascending: false })
                                  .limit(1)
                                  .maybeSingle();
                                const refreshedData = refreshed.data;
                                if (!refreshed.error && refreshedData) {
                                  setOrders((prev) =>
                                    prev.map((item) =>
                                      item.id === order.id
                                        ? {
                                            ...item,
                                            payment: {
                                              id: refreshedData.id,
                                              status: refreshedData.status,
                                              amount: Number(refreshedData.amount || 0),
                                              currency: refreshedData.currency ?? order.currency,
                                              created_at: refreshedData.created_at,
                                            },
                                          }
                                        : item,
                                    ),
                                  );
                                }
                                handleRefresh();
                              } catch (err) {
                                toast(err instanceof Error ? err.message : String(err), {
                                  variant: "error",
                                });
                              }
                            }}
                          >
                            Create payment
                          </Button>
                          {payment ? (
                            <>
                              <Button
                                variant="soft"
                                className="h-9 min-h-0 px-3 text-xs"
                                onClick={async () => {
                                  try {
                                    await callPayments(
                                      "/webhook",
                                      { payment_id: payment.id, status: "succeeded" },
                                      token,
                                    );
                                    setOrders((prev) =>
                                      prev.map((item) =>
                                        item.id === order.id
                                          ? {
                                              ...item,
                                              payment: {
                                                ...(item.payment as Payment),
                                                status: "succeeded",
                                              },
                                            }
                                          : item,
                                      ),
                                    );
                                    handleRefresh();
                                  } catch (err) {
                                    toast(err instanceof Error ? err.message : String(err), {
                                      variant: "error",
                                    });
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
                                    await callPayments(
                                      "/webhook",
                                      { payment_id: payment.id, status: "failed" },
                                      token,
                                    );
                                    setOrders((prev) =>
                                      prev.map((item) =>
                                        item.id === order.id
                                          ? {
                                              ...item,
                                              payment: {
                                                ...(item.payment as Payment),
                                                status: "failed",
                                              },
                                            }
                                          : item,
                                      ),
                                    );
                                    handleRefresh();
                                  } catch (err) {
                                    toast(err instanceof Error ? err.message : String(err), {
                                      variant: "error",
                                    });
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
            <div>
              Showing {orders.length} of {total.toLocaleString()} orders
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="h-8 px-3"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </Button>
              <span>
                Page {page} of {totalPages.toLocaleString()}
              </span>
              <Button
                variant="ghost"
                className="h-8 px-3"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                Next
              </Button>
            </div>
          </div>
*/
