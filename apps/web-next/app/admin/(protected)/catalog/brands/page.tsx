import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { BrandsClient } from "./brands-client";

export const metadata = {
  title: "Catalog brands",
};

export default function CatalogBrandsPage() {
  return (
    <AdminPageLayout
      title="Catalog brands"
      description="Manage the list of brands used by catalog models."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Catalog", href: "/admin/catalog" },
        { label: "Brands" },
      ]}
      sidebar={
        <AdminInfoPanel title="How it works">
          <p>Create canonical brands once and re-use them when defining catalog models.</p>
          <p>
            Slugs should stay stable because products reference them; use Delete sparingly to avoid breaking
            storefront filters.
          </p>
        </AdminInfoPanel>
      }
    >
      <BrandsClient />
    </AdminPageLayout>
  );
}