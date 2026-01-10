import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { PurchaseOrdersClient } from "./purchase-orders-client";

export const metadata = {
  title: "Purchase Orders",
};

export default function PurchaseOrdersPage() {
  return (
    <AdminPageLayout
      title="Purchase Orders"
      description="Monitor purchase orders and update their status."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Purchase Orders" },
      ]}
      sidebar={
        <AdminInfoPanel title="Tips">
          <p>Statuses: pending → sent → confirmed → shipped.</p>
          <p>Failed POs keep error_message for debugging.</p>
        </AdminInfoPanel>
      }
    >
      <PurchaseOrdersClient />
    </AdminPageLayout>
  );
}
