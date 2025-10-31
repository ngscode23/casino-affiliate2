"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Section from "@ui/components/common/section";
import Skeleton from "@ui/components/common/skeleton";
import { toast } from "@ui/components/common/toast";
import { getOrder, getProductsByIds } from "@shared/ecom/api/client";

type Props = { orderId: string };

function statusLabel(value: string | null | undefined) {
  const normalized = (value ?? "").toLowerCase();
  switch (normalized) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "refunded":
      return "Refunded";
    case "partial_refund":
      return "Partial refund";
    case "requires_action":
      return "Requires action";
    case "authorized":
      return "Authorized";
    default:
      return value || "-";
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
    case "refunded":
      return "bg-emerald-500/10 text-emerald-200 border border-emerald-500/30";
    case "partial_refund":
      return "bg-amber-500/10 text-amber-200 border border-amber-500/30";
    case "failed":
    case "cancelled":
      return "bg-rose-500/10 text-rose-200 border border-rose-500/30";
    case "requires_action":
      return "bg-purple-500/10 text-purple-200 border border-purple-500/30";
    default:
      return "bg-neutral-100 text-slate-700 border border-neutral-200 dark:bg-white/10 dark:text-white dark:border-white/20";
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

export function OrderDetailClient({ orderId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getOrder>> | null>(null);
  const [slugMap, setSlugMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getOrder(orderId);
        if (!active) return;
        setDetail(data);
        const ids = Array.from(new Set((data.items || []).map((it) => String(it.product_id)).filter(Boolean)));
        if (ids.length) {
          const prods = await getProductsByIds(ids);
          const map: Record<string, string> = {};
          for (const p of prods) map[String(p.id)] = String(p.slug || "");
          if (!active) return;
          setSlugMap(map);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || "Failed to load order");
        toast(msg || "Failed to load order", { variant: "error" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId]);

  const currency = detail?.order.currency || "EUR";
  const itemCount = detail?.items?.length || 0;
  const itemsTotal = useMemo(() => {
    return (detail?.items || []).reduce((sum, it) => sum + Number(it.total ?? it.unit_price ?? 0), 0);
  }, [detail]);

  return (
    <Section className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Order #{orderId}</h1>
        <Link href="/account/orders" className="text-sm text-white/70 hover:underline">
          Back to orders
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-6 w-1/5" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
      ) : !detail ? (
        <div className="rounded-lg border border-white/20 p-4 text-sm text-white/70">Order not found.</div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-white/70">Created: {formatDate(detail.order.created_at)}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusClass(detail.order.status)}`}>
              {statusLabel(detail.order.status)}
            </span>
            {detail.order.payment_status ? (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusClass(detail.order.payment_status)}`}>
                {statusLabel(detail.order.payment_status)}
              </span>
            ) : null}
          </div>

          <div className="rounded-lg border border-white/15 bg-black/30 p-4">
            <div className="mb-2 text-xs text-white/60">Items: {itemCount}</div>
            {itemCount === 0 ? (
              <div className="text-sm text-white/70">No items.</div>
            ) : (
              <ul className="space-y-2">
                {detail.items.map((it) => {
                  const productId = String(it.product_id || "");
                  const slug = productId ? slugMap[productId] : undefined;
                  const qty = it.qty ?? 1;
                  const unit = formatCurrency(it.unit_price ?? 0, currency);
                  const total = formatCurrency(it.total ?? it.unit_price ?? 0, currency);
                  return (
                    <li key={String(it.id)} className="flex flex-col gap-1 rounded-lg border border-white/15 bg-black/40 p-3 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        {slug ? (
                          <Link href={`/products/${slug}`} className="font-medium text-white hover:underline">
                            {it.title || productId}
                          </Link>
                        ) : (
                          <span className="font-medium text-white">{it.title || productId || "Item"}</span>
                        )}
                        <div className="text-xs text-white/50">Qty: {qty} × {unit}</div>
                      </div>
                      <div className="text-sm font-medium text-white">{total}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 text-sm text-white/80">
            <div>Subtotal: {formatCurrency(detail.order.amount_subtotal ?? itemsTotal, currency)}</div>
            <div>Discounts: {formatCurrency(detail.order.amount_discounts ?? 0, currency)}</div>
            <div>Tax/Shipping: {formatCurrency(detail.order.amount_tax ?? 0, currency)}</div>
            <div className="text-base font-semibold text-white">Total: {formatCurrency(detail.order.amount_total ?? itemsTotal, currency)}</div>
            {detail.payment ? (
              <div className="text-xs text-white/60">
                Payment: {statusLabel(detail.payment.status)}
                {detail.payment.amount ? ` · ${formatCurrency(detail.payment.amount, detail.payment.currency || currency)}` : ""}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Section>
  );
}

export default OrderDetailClient;
