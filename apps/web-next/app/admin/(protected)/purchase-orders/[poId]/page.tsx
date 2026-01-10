import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { PurchaseOrderDetailClient } from "./po-detail-client";

export const metadata = {
  title: "Purchase Order",
};

export default function PurchaseOrderDetailPage({ params }: { params: { poId: string } }) {
  return (
    <AdminPageLayout
      title="Purchase Order"
      description="Review purchase order status and items."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Purchase Orders", href: "/admin/purchase-orders" },
        { label: params.poId },
      ]}
      sidebar={
        <AdminInfoPanel title="Actions">
          <p>Статусы: pending → sent → confirmed → shipped.</p>
          <p>Используйте failed для ошибок и cancelled для стопа.</p>
        </AdminInfoPanel>
      }
    >
      <PurchaseOrderDetailClient poId={params.poId} />
    </AdminPageLayout>
  );
}
