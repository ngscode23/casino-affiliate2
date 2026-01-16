import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { ResetSkuDataClient } from "./reset-sku-data-client";

export const metadata = {
  title: "Maintenance",
};

export default function MaintenancePage() {
  return (
    <AdminPageLayout
      title="Maintenance"
      description="Danger zone: reset SKU and model data."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Maintenance" },
      ]}
      sidebar={
        <AdminInfoPanel title="Before you reset">
          <p>Categories and brands will stay intact.</p>
          <p>SKU-related data and catalog models will be removed.</p>
          <p>This cannot be undone. Use only in test environments.</p>
        </AdminInfoPanel>
      }
    >
      <ResetSkuDataClient />
    </AdminPageLayout>
  );
}
