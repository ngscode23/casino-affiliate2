import type { Metadata } from "next";
import { Suspense } from "react";

import Skeleton from "@ui/components/common/skeleton";

import { OffersClient } from "./offers-client";

export const metadata: Metadata = {
  title: "Admin · Offers",
  description: "Manage affiliate offers and their metadata.",
};

function OffersSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function AdminOffersPage() {
  return (
    <Suspense fallback={<OffersSkeleton />}>
      <OffersClient />
    </Suspense>
  );
}
