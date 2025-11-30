import type { Metadata } from "next";
import { Suspense } from "react";

import Skeleton from "@ui/components/common/skeleton";

import CustomersClient from "./customers-client";

export const metadata: Metadata = {
  title: "Admin · Customers",
  description: "Обзор покупателей и их активности в магазине.",
};

function CustomersSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Skeleton key={`customers-skeleton-${idx}`} className="h-14 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function AdminCustomersPage() {
  return (
    <Suspense fallback={<CustomersSkeleton />}>
      <CustomersClient />
    </Suspense>
  );
}
