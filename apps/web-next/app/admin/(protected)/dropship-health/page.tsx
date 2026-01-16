import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { DropshipHealthClient } from "./health-client";

export const metadata = {
  title: "Dropship health",
};

export default function DropshipHealthPage() {
  return (
    <AdminPageLayout
      title="Dropship health"
      description="Detect checkout blockers such as inactive SKUs, missing offers, or out-of-stock inventory."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Dropship health" },
      ]}
      sidebar={
        <AdminInfoPanel title="Notes">
          <p>This page scans your current SKUs and flags anything that would block checkout or payment.</p>
          <p>Use it before supplier feeds or bulk updates to catch problems early.</p>
        </AdminInfoPanel>
      }
    >
      <DropshipHealthClient />
    </AdminPageLayout>
  );
}
