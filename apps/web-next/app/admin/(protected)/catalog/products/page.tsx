import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { CatalogProductsClient } from "./catalog-products-client";

export const metadata = {
  title: "Catalog models",
};

export default function CatalogProductsPage() {
  return (
    <AdminPageLayout
      title="Catalog models"
      description="Create and edit catalog models (products) that can be linked to SKUs."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Catalog", href: "/admin/catalog" },
        { label: "Models" },
      ]}
      sidebar={
        <AdminInfoPanel title="Tips">
          <p>Assign every model to a brand. Once saved, you can reference the model from SKU editors.</p>
          <p>Use the status filter to hide draft or archived models from the storefront.</p>
        </AdminInfoPanel>
      }
    >
      <CatalogProductsClient />
    </AdminPageLayout>
  );
}