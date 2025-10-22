export const ORDER_STATUS_VALUES = [
  "pending",
  "paid",
  "cancelled",
  "refunded",
  "failed",
] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

const ORDER_STATUS_SET = new Set<string>(ORDER_STATUS_VALUES);

const ORDER_STATUS_ALIASES: Record<string, OrderStatus> = {
  canceled: "cancelled",
};

export const PAYMENT_STATUS_VALUES = [
  "pending",
  "requires_action",
  "authorized",
  "processing",
  "succeeded",
  "captured",
  "paid",
  "settled",
  "failed",
  "canceled",
  "cancelled",
  "refunded",
  "partial_refund",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

const PAYMENT_STATUS_SET = new Set<string>(PAYMENT_STATUS_VALUES);

export const PAYMENT_TO_ORDER_STATUS: Record<string, OrderStatus> = {
  succeeded: "paid",
  captured: "paid",
  paid: "paid",
  settled: "paid",
  failed: "failed",
  canceled: "cancelled",
  cancelled: "cancelled",
  refunded: "refunded",
  partial_refund: "refunded",
  requires_action: "pending",
  authorized: "pending",
  processing: "pending",
  pending: "pending",
};

/**
 * Normalize any order/payment status string to a canonical order status.
 */
export function toOrderStatus(raw: string | null | undefined): OrderStatus | null {
  if (!raw) return null;
  const normalized = String(raw).trim().toLowerCase();
  if (!normalized) return null;

  if (ORDER_STATUS_SET.has(normalized)) {
    return (normalized as OrderStatus) ?? null;
  }

  const alias = ORDER_STATUS_ALIASES[normalized];
  if (alias) return alias;

  const mapped = PAYMENT_TO_ORDER_STATUS[normalized];
  return mapped ?? null;
}

/**
 * Normalize any order/payment status string to a canonical payment status.
 */
export function toPaymentStatus(raw: string | null | undefined): PaymentStatus | null {
  if (!raw) return null;
  const normalized = String(raw).trim().toLowerCase();
  if (!normalized) return null;
  if (PAYMENT_STATUS_SET.has(normalized)) {
    return normalized as PaymentStatus;
  }
  if (normalized === "cancelled") {
    return "cancelled";
  }
  if (normalized === "canceled") {
    return "canceled";
  }
  return null;
}

export function normalizeOrderStatuses(input: ArrayLike<string> | Iterable<string> | null | undefined): OrderStatus[] {
  const collected = new Set<OrderStatus>();
  if (!input) return [];

  if (isIterable(input)) {
    for (const raw of input) {
      const status = toOrderStatus(raw);
      if (!status) continue;
      collected.add(status);
    }
  } else {
    const arrayLike = input as ArrayLike<string>;
    const length = typeof arrayLike.length === "number" ? arrayLike.length : 0;
    for (let index = 0; index < length; index += 1) {
      const raw = arrayLike[index];
      const status = toOrderStatus(raw);
      if (!status) continue;
      collected.add(status);
    }
  }
  return Array.from(collected);
}

/**
 * Helper for building SQL clauses: determine which statuses belong to order.status vs payments.status.
 */
export function resolveStatusFilters(
  raw: string | string[] | null | undefined,
): { order: OrderStatus[]; payment: PaymentStatus[] } {
  const order = new Set<OrderStatus>();
  const payment = new Set<PaymentStatus>();

  if (typeof raw === "string" && raw.length > 0) {
    const normalized = raw.trim().toLowerCase();
    if (normalized) {
      const candidates = normalized.split(",").map((value) => value.trim()).filter(Boolean);
      for (const candidate of candidates) {
        const orderStatus = toOrderStatus(candidate);
        if (orderStatus) order.add(orderStatus);
        const paymentStatus = toPaymentStatus(candidate);
        pushPaymentStatus(payment, paymentStatus);
      }
    }
  } else if (Array.isArray(raw) || isIterable(raw)) {
    const values = Array.isArray(raw) ? raw : Array.from(raw as Iterable<string>);
    for (const value of values) {
      const orderStatus = toOrderStatus(value);
      if (orderStatus) order.add(orderStatus);
      const paymentStatus = toPaymentStatus(value);
      pushPaymentStatus(payment, paymentStatus);
    }
  }
  return {
    order: Array.from(order),
    payment: Array.from(payment),
  };
}

function isIterable(value: unknown): value is Iterable<string> {
  return Boolean(value)
    && typeof value !== "string"
    && typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function";
}

function pushPaymentStatus(set: Set<PaymentStatus>, status: PaymentStatus | null): void {
  if (!status) return;
  set.add(status);
  if (status === "canceled") set.add("cancelled");
  if (status === "cancelled") set.add("canceled");
}
