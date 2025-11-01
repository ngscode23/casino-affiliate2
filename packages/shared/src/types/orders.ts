import type { Database } from "../lib/database.types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export interface OrderSummary {
  id: string;
  userId: string | null;
  createdAt: string;
  totalAmount: number;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
}

export interface OrderHistoryEntry {
  orderId: string;
  createdAt: string;
  amount: number;
  currency: string;
  status: string;
}

export interface OrderItemRow {
  id: string;
  orderId: string;
  productId: string | null;
  title: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PaymentRow {
  id: string;
  orderId: string;
  amount: number;
  currency: string | null;
  status: PaymentStatus;
  provider: string | null;
  providerReference: string | null;
  createdAt: string;
}

export interface RefundRow {
  id: string;
  orderId: string;
  paymentIntentId: string | null;
  amountCents: number;
  currency: string | null;
  reason: string | null;
  createdAt: string;
}

export interface OrderDetail {
  summary: OrderSummary;
  items: OrderItemRow[];
  payments: PaymentRow[];
  refunds: RefundRow[];
  history: OrderHistoryEntry[];
}

export interface PaginatedOrders {
  items: OrderSummary[];
  page: number;
  perPage: number;
  total: number;
}
