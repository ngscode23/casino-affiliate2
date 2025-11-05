import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminContentWrapper, AdminPageLayout } from "@/components/admin/layout";
import { DiscountForm } from "../_components/discount-form";

type DiscountPageParams = { params: Promise<{ id: string }> };

async function getDiscount(id: string) {
  const discount = await prisma.discount.findUnique({
    where: { id },
    include: {
      assignments: true,
      exclusions: true,
      coupons: true,
    },
  });

  if (!discount) return null;

  type CouponRecord = typeof discount.coupons[number];

  return {
    ...discount,
    percentOff: discount.percentOff ? Number(discount.percentOff) : null,
    coupons: discount.coupons.map((coupon: CouponRecord) => ({
      ...coupon,
      startsAt: coupon.startsAt ? coupon.startsAt.toISOString() : null,
      endsAt: coupon.endsAt ? coupon.endsAt.toISOString() : null,
    })),
  };
}

export default async function EditDiscountPage({ params }: DiscountPageParams) {
  const { id } = await params;
  const discount = await getDiscount(id);
  if (!discount) notFound();

  return (
    <AdminContentWrapper>
      <AdminPageLayout
        title={`Скидка: ${discount.name}`}
        description="Отредактируйте параметры скидки и связанные сущности."
        breadcrumbs={[
          { label: "Админка", href: "/admin" },
          { label: "Скидки", href: "/admin/discounts" },
          { label: discount.name },
        ]}
      >
        <DiscountForm mode="edit" discountId={id} initial={discount} />
      </AdminPageLayout>
    </AdminContentWrapper>
  );
}
