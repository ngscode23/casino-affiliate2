import { Fragment } from "react";
import Link from "next/link";

import { mutedTextXs } from "@/styles/classnames";

import type { OrderDetail, OrderListItem } from "@/types/domain";
import { CANCELLABLE_PAYMENT_STATUSES } from "../useOrders";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "canceled", label: "Canceled" },
  { value: "refunded", label: "Refunded" },
  { value: "partial_refund", label: "Partial refund" },
  { value: "requires_action", label: "Requires action" },
];

function statusLabel(value: string | null | undefined) {
  const normalized = (value ?? "").toLowerCase();
  switch (normalized) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "paid":
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "canceled":
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
    case "paid":
    case "succeeded":
    case "refunded":
      return "bg-emerald-500/10 text-emerald-200 border border-emerald-500/30";
    case "partial_refund":
      return "bg-amber-500/10 text-amber-200 border border-amber-500/30";
    case "failed":
    case "cancelled":
    case "canceled":
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

export type OrdersListProps = {
  orders: OrderListItem[];
  expanded: Record<string, boolean>;
  details: Record<string, OrderDetail | null>;
  pendingMap: Record<string, "pay" | "cancel" | null | undefined>;
  slugMap: Record<string, string>;
  onToggle: (orderId: string) => Promise<void>;
  onPay: (orderId: string) => Promise<void>;
  onCancel: (orderId: string) => Promise<void>;
};

export function OrdersList({ orders, expanded, details, pendingMap, slugMap, onToggle, onPay, onCancel }: OrdersListProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/35 bg-card/85 shadow-soft">
      <table className="w-full text-sm">
        <thead className="border-b border-border/30 text-left text-muted-foreground">
          <tr>
            <th className="px-5 py-3 font-semibold text-muted-foreground">Order</th>
            <th className="px-5 py-3 font-semibold text-muted-foreground">Placed on</th>
            <th className="px-5 py-3 font-semibold text-muted-foreground">Status</th>
            <th className="px-5 py-3 font-semibold text-muted-foreground">Total</th>
            <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isOpen={!!expanded[order.id]}
              detail={details[order.id]}
              paymentState={pendingMap[order.id] ?? null}
              slugMap={slugMap}
              onToggle={onToggle}
              onPay={onPay}
              onCancel={onCancel}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

type OrderCardProps = {
  order: OrderListItem;
  isOpen: boolean;
  detail: OrderDetail | null | undefined;
  paymentState: "pay" | "cancel" | null;
  slugMap: Record<string, string>;
  onToggle: (orderId: string) => Promise<void>;
  onPay: (orderId: string) => Promise<void>;
  onCancel: (orderId: string) => Promise<void>;
};

function OrderCard({ order, isOpen, detail, paymentState, slugMap, onToggle, onPay, onCancel }: OrderCardProps) {
  const orderId = order.id;
  const paymentStatus = (order.paymentStatus ?? "").toLowerCase();
  const canPay = order.status === "pending" || order.status === "processing";
  const canCancel = order.status === "pending" && (!paymentStatus || CANCELLABLE_PAYMENT_STATUSES.has(paymentStatus));
  const toggleLabel = isOpen ? "Hide details" : detail ? `View items (${detail.items.length})` : "Load details";

  return (
    <Fragment>
      <tr className="border-b border-border/20 transition hover:bg-card/70">
        <td className="px-5 py-3 font-medium text-fg">{orderId}</td>
        <td className="px-5 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
        <td className="px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusClass(order.status)}`}>
              {statusLabel(order.status)}
            </span>
            {order.paymentStatus ? (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusClass(order.paymentStatus)}`}>
                {statusLabel(order.paymentStatus)}
              </span>
            ) : null}
          </div>
        </td>
        <td className="px-5 py-3 font-medium text-fg">{formatCurrency(order.totalCents / 100, order.currency || "EUR")}</td>
        <td className="px-5 py-3">
          <OrderActions
            toggleLabel={toggleLabel}
            canPay={canPay}
            canCancel={canCancel}
            paymentState={paymentState}
            onToggle={() => void onToggle(orderId)}
            onPay={() => void onPay(orderId)}
            onCancel={() => void onCancel(orderId)}
            isPendingStatus={order.status === "pending"}
          />
        </td>
      </tr>
      {isOpen ? (
        <tr className="border-b border-border/20 bg-card/75">
          <td colSpan={5} className="px-5 py-5">
            <OrderItems detail={detail} slugMap={slugMap} orderId={orderId} />
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

type OrderActionsProps = {
  toggleLabel: string;
  canPay: boolean;
  canCancel: boolean;
  paymentState: "pay" | "cancel" | null;
  onToggle: () => void;
  onPay: () => void;
  onCancel: () => void;
  isPendingStatus: boolean;
};

function OrderActions({ toggleLabel, canPay, canCancel, paymentState, onToggle, onPay, onCancel, isPendingStatus }: OrderActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onToggle}
        className="rounded-full border border-border/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
      >
        {toggleLabel}
      </button>
      {canPay ? (
        <button
          type="button"
          onClick={onPay}
          disabled={paymentState === "pay"}
          className="rounded-full border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {paymentState === "pay" ? "Paying..." : "Pay now"}
        </button>
      ) : null}
      {canCancel ? (
        <button
          type="button"
          onClick={onCancel}
          disabled={paymentState === "cancel"}
          className="rounded-full border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {paymentState === "cancel" ? "Cancelling..." : "Cancel order"}
        </button>
      ) : isPendingStatus ? (
        <span className="inline-flex items-center rounded-full border border-border/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground/70">
          Payment pending.
        </span>
      ) : null}
    </div>
  );
}

type OrderItemsProps = {
  detail: OrderDetail | null | undefined;
  slugMap: Record<string, string>;
  orderId: string;
};

function OrderItems({ detail, slugMap, orderId }: OrderItemsProps) {
  if (!detail) {
    return <div className={mutedTextXs}>Loading order details...</div>;
  }
  if (detail.items.length === 0) {
    return <div className={mutedTextXs}>No items were recorded for this order.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Items * {detail.items.length}</div>
      <ul className="space-y-3">
        {detail.items.map((item) => {
          const productId = item.productId ? String(item.productId) : "";
          const slug = productId ? slugMap[productId] : undefined;
          const quantity = item.quantity ?? 1;
          const unit = formatCurrency(item.priceCents / 100, detail.currency);
          const totalAmount = formatCurrency((item.priceCents * quantity) / 100, detail.currency);
          return (
            <li
              key={`${orderId}-${productId}-${item.id}`}
              className="flex flex-col gap-2 rounded-2xl border border-border/30 bg-card/70 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                {slug ? (
                  <Link href={`/products/${slug}`} className="font-semibold text-fg transition hover:text-primary">
                    {item.title || productId}
                  </Link>
                ) : (
                  <span className="font-semibold text-fg">{item.title || productId || "Item"}</span>
                )}
                <div className={mutedTextXs}>
                  Quantity: {quantity} x {unit}
                </div>
              </div>
              <div className="text-sm font-semibold text-fg">{totalAmount}</div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
        <div>Subtotal: {formatCurrency((detail.subtotalCents ?? 0) / 100, detail.currency)}</div>
        <div>Discounts: {formatCurrency((detail.discountCents ?? 0) / 100, detail.currency)}</div>
        <div>Tax &amp; duties: {formatCurrency((detail.taxCents ?? 0) / 100, detail.currency)}</div>
        <div className="text-base font-semibold text-fg">Total: {formatCurrency(detail.totalCents / 100, detail.currency)}</div>
        {detail.payment ? (
          <div className="text-xs text-muted-foreground/80">
            Payment: {statusLabel(detail.payment.status)}
            {detail.payment.amountCents != null
              ? ` - ${formatCurrency((detail.payment.amountCents ?? 0) / 100, detail.payment.currency || detail.currency)}`
              : ""}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { STATUS_OPTIONS, statusLabel, statusClass, formatCurrency, formatDate };
