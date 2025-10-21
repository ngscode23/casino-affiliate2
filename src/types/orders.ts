/**
 * DTO для списка заказов. Используем одинаково в SDK и API, чтобы
 * избежать расходжений между фронтом и бэкендом.
 */
export interface OrderListItem {
  id: string;
  userId: string;
  createdAt: string;
  status: string;
  paymentStatus: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  shipping?: number;
  currency: string;
  lastPaymentStatus: string | null;
  lastPaymentAt: string | null;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  provider: string | null;
  providerRef: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface OrderRefund {
  id: string;
  orderId: string;
  paymentIntentId: string | null;
  amount: number;
  currency: string;
  reason: string | null;
  createdAt: string;
}

export interface OrderItemDTO {
  id: string;
  orderId: string;
  productId: string | null;
  variantId: string | null;
  title: string;
  quantity: number;
  unitPrice: number;
  total: number;
  meta?: Record<string, unknown> | null;
}

export interface OrderHistoryEntryDTO {
  occurredAt: string;
  actor: string | null;
  type: string;
  payload: Record<string, unknown> | null;
}

export interface OrderDetails {
  order: OrderListItem & {
    checkoutMetadata?: Record<string, unknown> | null;
    contactEmail?: string | null;
    paymentIntentId?: string | null;
    metadata?: Record<string, unknown> | null;
    paidAt?: string | null;
    cancelledAt?: string | null;
  };
  items: OrderItemDTO[];
  payments: OrderPayment[];
  refunds: OrderRefund[];
  history: OrderHistoryEntryDTO[];
}

export interface OrdersListResponse {
  items: OrderListItem[];
  nextCursor?: string;
  total?: number;
  meta: {
    limit: number;
    sort: "created_at" | "amount_total";
    dir: "asc" | "desc";
    cursor?: string;
    hasMore: boolean;
    tookMs: number;
    cache: {
      hit: boolean;
      adapter: string;
      ttlMs: number;
    };
  };
}

export interface OrderDetailsResponse {
  order: OrderDetails;
  meta: {
    tookMs: number;
    cache: {
      hit: boolean;
      adapter: string;
      ttlMs: number;
    };
  };
}
