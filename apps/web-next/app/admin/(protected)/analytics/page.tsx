import { Suspense } from "react";
import type { Metadata } from "next";

import { AdminAnalyticsClient } from "./analytics-client";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Clicks, impressions, and UTM performance overview.",
};

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <AdminAnalyticsClient />
    </Suspense>
  );
}
