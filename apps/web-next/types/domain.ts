// Shared domain types for web-next.

export type CurrencyCode = string; // expected to be a three-letter ISO code at runtime

export type RecMeta = {
  treatment?: string | null;
  rank?: number | null;
  reason?: string | null;
  score?: number | null;
  adjusted_score?: number | null;
  bandit_from?: number | null;
  rollout?: number | null;
  placement?: string | null;
  source?: string | null;
};

export type Product = {
  id: string;
  slug: string;
  sku: string | null;
  title: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  brandSlug?: string | null;
  brandName?: string | null;
  model: string | null;
  modelSlug?: string | null;
  modelTitle?: string | null;
  catalogProductId?: string | null;
  price: number;
  priceCents?: number | null;
  originalPrice?: number | null;
  originalPriceCents?: number | null;
  discountPercent?: number | null;
  discountAmountCents?: number | null;
  currency: CurrencyCode;
  mainImage: string | null;
  thumbnailPath?: string | null;
  rating: number | null;
  clicks: number;
  impressions: number;
  dataset: "shop" | "legacy";
  order: number;
  createdAt?: string | null;
  isNew?: boolean;
  isTop?: boolean;
  availability: "InStock" | "OutOfStock" | "PreOrder";
  categorySlug: string | null;
  recMeta?: RecMeta;
};

export type CategorySummary = { slug: string; label: string; count: number };

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  priceCents: number;
  currency: CurrencyCode;
  title: string;
  thumbnail?: string | null;
  sku?: string | null;
};

export type OrderSummary = {
  id: string;
  userId: string;
  status:
    | "pending"
    | "paid"
    | "cancelled"
    | "refunded"
    | "canceled"
    | "failed";
  subtotalCents?: number | null;
  discountTotalCents?: number | null;
  shippingTotalCents?: number | null;
  totalCents: number;
  currency: CurrencyCode;
  createdAt: string;
  items?: CartItem[];
};

export type OrderStatus =
  | "pending"
  | "processing"
  | "paid"
  | "cancelled"
  | "refunded"
  | "canceled"
  | "failed";

export type PaymentStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "authorized"
  | "captured"
  | "paid"
  | "canceled"
  | "refunded"
  | "partial_refund"
  | "requires_action";

export type OrderListItem = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  totalCents: number;
  currency: CurrencyCode;
};

export type OrderDetail = OrderListItem & {
  items: CartItem[];
  subtotalCents?: number | null;
  discountCents?: number | null;
  taxCents?: number | null;
  payment?: {
    status: PaymentStatus;
    amountCents?: number | null;
    currency?: CurrencyCode | null;
    provider?: string | null;
    providerRef?: string | null;
  } | null;
};

export type UserProfile = {
  anon_id: string;
  first_seen?: string | null;
  last_seen?: string | null;
  updated_at?: string | null;
  visit_count?: number | null;
  device_pref?: string | null;
  countries?: string[] | null;
  categories?: string[] | null;
  discount_affinity?: number | null;
  cold_start?: boolean | null;
  opt_out?: boolean | null;
  experiment_variant?: string | null;
};
