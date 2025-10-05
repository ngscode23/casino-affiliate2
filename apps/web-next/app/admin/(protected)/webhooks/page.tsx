import type { Metadata } from "next";
import { Suspense } from "react";

import { WebhooksClient } from "./webhooks-client";

export const metadata: Metadata = {
  title: "Admin - Webhooks",
  description: "Inspect Stripe webhook deliveries and purge stale entries.",
};

export default function AdminWebhooksPage() {
  return (
    <Suspense fallback={null}>
      <WebhooksClient />
    </Suspense>
  );
}
