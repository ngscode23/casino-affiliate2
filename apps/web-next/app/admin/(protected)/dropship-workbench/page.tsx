import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { DropshipWorkbenchClient } from "./workbench-client";

export const metadata = {
  title: "Dropship Workbench",
};

export default function DropshipWorkbenchPage() {
  return (
    <AdminPageLayout
      title="Dropship Workbench"
      description="Map supplier feeds to SKUs, run feeds, and inspect offers/inventory in one place."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Dropship Workbench" },
      ]}
      sidebar={
        <AdminInfoPanel title="Workflow">
          <p>Start from unmapped vendor SKUs or pick a SKU directly.</p>
          <p>Create mappings once: one SKU can have multiple suppliers.</p>
          <p>Offers and inventory remain the source of truth for sellable status.</p>
        </AdminInfoPanel>
      }
    >
      <DropshipWorkbenchClient />
    </AdminPageLayout>
  );
}
