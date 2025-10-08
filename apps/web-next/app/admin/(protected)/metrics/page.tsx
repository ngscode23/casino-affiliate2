import type { Metadata } from "next";
import { Suspense } from "react";

import Skeleton from "@ui/components/common/skeleton";

import { MetricsClient } from "./metrics-client";

export const metadata: Metadata = {
  title: "Admin · Metrics",
  description: "Traffic and offer metrics for the selected period.",
};

function MetricsSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function AdminMetricsPage() {
  return (
    <Suspense fallback={<MetricsSkeleton />}>
      <MetricsClient />
    </Suspense>
  );
}
