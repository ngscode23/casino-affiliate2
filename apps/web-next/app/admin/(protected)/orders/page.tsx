import type { Metadata } from "next";
import { Suspense } from "react";

import Skeleton from "@ui/components/common/skeleton";

import { OrdersClient } from "./orders-client";

export const metadata: Metadata = {
  title: "Admin · Orders",
  description: "Review recent orders, payments, and trigger manual payment flows.",
};

function OrdersSkeleton() {
  return (
    <div className="space-y-2 p-6">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-24 w-full max-w-4xl" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrdersClient />
    </Suspense>
  );
}
