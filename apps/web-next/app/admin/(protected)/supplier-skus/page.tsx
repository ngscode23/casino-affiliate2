import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { SupplierSkusClient } from "./mapping-client";

export const metadata = {
  title: "Supplier SKUs",
};

export default function SupplierSkusPage() {
  return (
    <AdminPageLayout
      title="Supplier SKUs"
      description="Map supplier SKUs to your store SKUs and update cost/lead time."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Supplier SKUs" },
      ]}
      sidebar={
        <AdminInfoPanel title="How it works">
          <p>Select a supplier and attach your SKU ids to vendor SKU references.</p>
          <p>These mappings drive lead times and cost updates.</p>
          <p>Availability and stock are managed in Supplier Inventory.</p>
        </AdminInfoPanel>
      }
    >
      <SupplierSkusClient />
    </AdminPageLayout>
  );
}
