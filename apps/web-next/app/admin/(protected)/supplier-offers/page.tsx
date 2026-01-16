import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { SupplierOffersClient } from "./offers-client";

export const metadata = {
  title: "Supplier Offers",
};

export default function SupplierOffersPage() {
  return (
    <AdminPageLayout
      title="Supplier Offers"
      description="Review supplier pricing and active offers for mapped SKUs."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Supplier Offers" },
      ]}
      sidebar={
        <AdminInfoPanel title="Notes">
          <p>Offers are updated from supplier feeds and drive pricing decisions.</p>
          <p>Use filters to inspect active/paused/expired offers per supplier.</p>
        </AdminInfoPanel>
      }
    >
      <SupplierOffersClient />
    </AdminPageLayout>
  );
}
