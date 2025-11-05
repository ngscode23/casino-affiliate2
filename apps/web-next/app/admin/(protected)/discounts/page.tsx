import Link from "next/link";
import { AdminContentWrapper, AdminPageLayout, AdminSurface } from "@/components/admin/layout";
import { loadDiscounts } from "@/lib/discounts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getDiscounts() {
  if (!process.env.DATABASE_URL) {
    console.warn("[admin/discounts] DATABASE_URL is not set; returning empty list");
    return [];
  }

  const now = new Date();
  const discounts = await loadDiscounts(prisma, {
    channel: "all",
    now,
    includeInactive: true,
  });

  return discounts.map((discount) => ({
    id: discount.id,
    name: discount.name,
    type: discount.type,
    priority: discount.priority,
    active: discount.active,
    channel: discount.channel,
    startAt: discount.startAt ? discount.startAt.toISOString() : null,
    endAt: discount.endAt ? discount.endAt.toISOString() : null,
    assignments: discount.assignments.length,
    coupons: discount.coupons.length,
  }));
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DiscountsPage() {
  const discounts = await getDiscounts();

  return (
    <AdminContentWrapper>
      <AdminPageLayout
        title="Скидки"
        description="Управляйте правилами скидок, купонами и назначениями."
        breadcrumbs={[
          { label: "Админка", href: "/admin" },
          { label: "Скидки" },
        ]}
        primaryActions={
          <Link
            href="/admin/discounts/new"
            className="inline-flex items-center justify-center px-4 rounded-xl font-semibold transition min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 bg-[color:var(--brand,#3B82F6)] text-[color:var(--brand-fg,#FFFFFF)] hover:brightness-95"
          >
            Новая скидка
          </Link>
        }
      >
        <AdminSurface padded="lg">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-admin-border/60 text-left text-xs uppercase tracking-wide text-admin-textSubtle">
                  <th className="py-2 pr-4">Название</th>
                  <th className="py-2 pr-4">Тип</th>
                  <th className="py-2 pr-4">Канал</th>
                  <th className="py-2 pr-4">Период</th>
                  <th className="py-2 pr-4">Приоритет</th>
                  <th className="py-2 pr-4">Назначения</th>
                  <th className="py-2 pr-4">Купоны</th>
                  <th className="py-2 pr-4">Статус</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((discount) => (
                  <tr key={discount.id} className="border-b border-admin-border/30">
                    <td className="py-2 pr-4">
                      <Link className="text-primary underline" href={`/admin/discounts/${discount.id}`}>
                        {discount.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 uppercase">{discount.type}</td>
                    <td className="py-2 pr-4">{discount.channel}</td>
                    <td className="py-2 pr-4 text-xs text-admin-textSoft">
                      <div>{formatDate(discount.startAt)}</div>
                      <div>{formatDate(discount.endAt)}</div>
                    </td>
                    <td className="py-2 pr-4">{discount.priority}</td>
                    <td className="py-2 pr-4">{discount.assignments}</td>
                    <td className="py-2 pr-4">{discount.coupons}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${discount.active ? "bg-emerald-200/50 text-emerald-800" : "bg-red-200/50 text-red-800"}`}
                      >
                        {discount.active ? "Активна" : "Неактивна"}
                      </span>
                    </td>
                  </tr>
                ))}
                {discounts.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-sm text-admin-textSoft" colSpan={8}>
                      Скидки не найдены.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </AdminSurface>
      </AdminPageLayout>
    </AdminContentWrapper>
  );
}
