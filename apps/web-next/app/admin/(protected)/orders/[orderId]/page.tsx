import type { Metadata } from "next";
import { Suspense } from "react";

import Skeleton from "@ui/components/common/skeleton";

import { OrderDetailClient } from "./order-detail-client";

export const metadata: Metadata = {
  title: "Admin · Order details",
  description: "Inspect order payments, items, and status history.",
};

function OrderSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderDetailClient orderId={orderId} />
    </Suspense>
  );
}
