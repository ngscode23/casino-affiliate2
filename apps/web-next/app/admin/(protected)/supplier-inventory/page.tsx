import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { SupplierInventoryClient } from "./inventory-client";

export const metadata = {
  title: "Supplier Inventory",
};

export default function SupplierInventoryPage() {
  return (
    <AdminPageLayout
      title="Supplier Inventory"
      description="Inspect supplier availability and stock levels."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Supplier Inventory" },
      ]}
      sidebar={
        <AdminInfoPanel title="Notes">
          <p>Inventory records power availability checks in checkout and PO creation.</p>
          <p>If a SKU has no inventory row, it is treated as unavailable.</p>
        </AdminInfoPanel>
      }
    >
      <SupplierInventoryClient />
    </AdminPageLayout>
  );
}
