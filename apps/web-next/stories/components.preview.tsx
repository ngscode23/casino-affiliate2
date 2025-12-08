import { ProductsGrid } from "../app/products/ProductsGrid";
import type { ProductGridItem } from "@/components/ProductGrid";
import { PdpInfo } from "../app/products/[slug]/components/PdpInfo";
import type { ReviewBucket } from "../app/products/[slug]/components/pdp-types";
import { OrdersList } from "../app/account/orders/components/OrdersList";
import type { OrderDetail, OrderListItem } from "@/types/domain";

const sampleProducts: ProductGridItem[] = [
  {
    id: "p1",
    slug: "sample-product-1",
    title: "Sample Product One",
    subtitle: "Compact yet powerful.",
    image: "/logo.png",
    price: "$120.00",
    originalPrice: "$150.00",
    badge: "New",
    meta: "Category  1.2k views",
    availability: "InStock",
  },
  {
    id: "p2",
    slug: "sample-product-2",
    title: "Sample Product Two",
    subtitle: "Designed for speed.",
    image: "/logo.png",
    price: "$220.00",
    badge: "Popular",
    meta: "Hardware  3.5k views",
    availability: "InStock",
  },
];

export function ProductsGridPreview() {
  return (
    <div className="space-y-4 bg-slate-900 p-4">
      <ProductsGrid
        theme="dark"
        layoutMode="grid"
        gridItems={sampleProducts}
        showSkeleton={false}
        skeletonCount={0}
        hasError={false}
        hasItems
        onHardReset={() => undefined}
        onFocusSearch={() => undefined}
      />
    </div>
  );
}

const sampleBuckets: ReviewBucket[] = [
  { score: 5, count: 18, percent: 72 },
  { score: 4, count: 4, percent: 16 },
  { score: 3, count: 2, percent: 8 },
  { score: 2, count: 1, percent: 4 },
  { score: 1, count: 0, percent: 0 },
];

export function PdpInfoPreview() {
  return (
    <div className="max-w-xl p-6">
      <PdpInfo
        title="Preview Product"
        categoryName="Hardware"
        availabilityLabel="In stock"
        reviewAverageLabel="4.6"
        reviewCount={25}
        reviewBuckets={sampleBuckets}
        activeReviewFilter={null}
        onReviewFilterSelect={() => undefined}
        shortDescription="A short description of the preview product used for UI testing."
      />
    </div>
  );
}

const sampleOrders: OrderListItem[] = [
  {
    id: "order-1",
    createdAt: new Date().toISOString(),
    status: "pending",
    paymentStatus: "pending",
    totalCents: 19900,
    currency: "USD",
  },
];

const sampleDetails: Record<string, OrderDetail> = {
  "order-1": {
    id: "order-1",
    createdAt: new Date().toISOString(),
    status: "pending",
    paymentStatus: "pending",
    totalCents: 19900,
    currency: "USD",
    items: [
      { id: "line-1", productId: "p1", title: "Sample Product One", quantity: 1, priceCents: 19900, currency: "USD", sku: null, thumbnail: null },
    ],
    subtotalCents: 19900,
    discountCents: 0,
    taxCents: 0,
    payment: null,
  },
};

export function OrdersListPreview() {
  return (
    <div className="rounded-2xl border border-border/30 bg-card/80 p-4">
      <OrdersList
        orders={sampleOrders}
        expanded={{ "order-1": true }}
        details={sampleDetails}
        pendingMap={{}}
        slugMap={{ p1: "sample-product-1" }}
        onToggle={async () => undefined}
        onPay={async () => undefined}
        onCancel={async () => undefined}
      />
    </div>
  );
}
