import type { Metadata } from "next";
import { Suspense } from "react";

import Skeleton from "@ui/components/common/skeleton";

import { ApprovedReviewsClient } from "./reviews-client";

export const metadata: Metadata = {
  title: "Admin • Reviews",
  description: "Просмотр одобренных отзывов покупателей.",
};

function ReviewsSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<ReviewsSkeleton />}>
      <ApprovedReviewsClient />
    </Suspense>
  );
}
