import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { ShipmentsClient } from "./shipments-client";
import { ProcessEmailOutboxButton } from "./process-email-outbox-button.client";

export const metadata = {
  title: "Shipments",
};

export default function ShipmentsPage() {
  return (
    <AdminPageLayout
      title="Shipments"
      description="Track outbound shipments and update tracking data."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Shipments" },
      ]}
      primaryActions={<ProcessEmailOutboxButton />}
      sidebar={
        <AdminInfoPanel title="Tips">
          <p>Statuses: pending → in_transit → delivered. Use exception/returned/cancelled for problems.</p>
          <p>Tracking number is de-duplicated and will upsert an existing row.</p>
        </AdminInfoPanel>
      }
    >
      <ShipmentsClient />
    </AdminPageLayout>
  );
}
