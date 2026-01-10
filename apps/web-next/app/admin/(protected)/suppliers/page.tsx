import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { SuppliersClient } from "./suppliers-client";

export const metadata = {
  title: "Suppliers",
};

export default function SuppliersPage() {
  return (
    <AdminPageLayout
      title="Suppliers"
      description="Manage supplier accounts and defaults for dropshipping."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Suppliers" },
      ]}
      sidebar={
        <AdminInfoPanel title="How it works">
          <p>Create one supplier record per vendor you source from.</p>
          <p>Use the supplier id when importing feeds and mapping supplier SKUs.</p>
        </AdminInfoPanel>
      }
    >
      <SuppliersClient />
    </AdminPageLayout>
  );
}
