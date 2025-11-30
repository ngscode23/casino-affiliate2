import type { Metadata } from "next";

import { AdminPageLayout, AdminSurface, AdminContentWrapper } from "@/components/admin/layout";

export const metadata: Metadata = {
  title: "Admin · New customer",
};

export default function AdminCustomersNewPage() {
  return (
    <AdminPageLayout title="Customers" description="Создание клиента">
      <AdminContentWrapper>
        <AdminSurface>
          <div className="space-y-3 text-sm text-admin-text">
            <p className="text-base font-semibold text-admin-text">Ручное создание пока недоступно</p>
            <p>
              Клиенты появляются автоматически после оформления заказа или синхронизации из Stripe. Если нужно
              добавить клиента вручную, создайте его в Stripe и дождитесь фонового импорта (обычно до 5 минут).
            </p>
          </div>
        </AdminSurface>
      </AdminContentWrapper>
    </AdminPageLayout>
  );
}
