import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { RmaRequestsClient } from "./rma-requests-client";

export const metadata = {
  title: "RMA Requests",
};

export default function RmaRequestsPage() {
  return (
    <AdminPageLayout
      title="RMA Requests"
      description="View return/repair requests from customers."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "RMA Requests" },
      ]}
      sidebar={
        <AdminInfoPanel title="Workflow">
          <p>Statuses are free-form; use pending/approved/rejected/received/refunded.</p>
          <p>Requests are unique per order; updating status notifies dashboards only.</p>
        </AdminInfoPanel>
      }
    >
      <RmaRequestsClient />
    </AdminPageLayout>
  );
}
