import type { Metadata } from "next";
import { Suspense } from "react";

import { PartnersClient } from "./partners-client";

export const metadata: Metadata = {
  title: "Admin - Partners",
  description: "Manage partner subscriptions, pins, and webhook logs.",
};

export default function AdminPartnersPage() {
  return (
    <Suspense fallback={null}>
      <PartnersClient />
    </Suspense>
  );
}
