import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminDashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Overview of recent metrics and management shortcuts.",
};

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={null}>
      <AdminDashboardClient />
    </Suspense>
  );
}
