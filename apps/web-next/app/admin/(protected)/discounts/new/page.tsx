import { AdminContentWrapper, AdminPageLayout } from "@/components/admin/layout";
import { DiscountForm } from "../_components/discount-form";

export default function NewDiscountPage() {
  return (
    <AdminContentWrapper>
      <AdminPageLayout
        title="Новая скидка"
        breadcrumbs={[
          { label: "Админка", href: "/admin" },
          { label: "Скидки", href: "/admin/discounts" },
          { label: "Новая" },
        ]}
        description="Создайте правило скидки, настроив тип, ограничения и назначения."
      >
        <DiscountForm mode="create" />
      </AdminPageLayout>
    </AdminContentWrapper>
  );
}
