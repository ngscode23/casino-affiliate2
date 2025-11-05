import { Prisma } from "@generated/prisma/client";
import type { DiscountInput } from "@/lib/discounts";

export type DiscountMutationResult = Prisma.DiscountGetPayload<{
  include: {
    assignments: true;
    exclusions: true;
    coupons: true;
  };
}>;

type DiscountTx = Prisma.TransactionClient;
type DiscountAssignmentInput = DiscountInput["assignments"][number];
type DiscountExclusionInput = DiscountInput["exclusions"][number];
type DiscountCouponInput = DiscountInput["coupons"][number];

function baseDiscountData(input: DiscountInput): Prisma.DiscountUpdateInput {
  return {
    name: input.name,
    description: input.description ?? null,
    type: input.type,
    percentOff: input.percentOff ?? null,
    amountOffCts: input.amountOffCts ?? null,
    currency: input.currency ? input.currency.trim().toUpperCase() : null,
    bogoBuyQty: input.bogoBuyQty ?? null,
    bogoGetQty: input.bogoGetQty ?? null,
    stackable: input.stackable ?? false,
    priority: input.priority ?? 100,
    minSubtotalCts: input.minSubtotalCts ?? null,
    minQty: input.minQty ?? null,
    startAt: input.startAt ?? null,
    endAt: input.endAt ?? null,
    channel: input.channel ? input.channel.trim().toLowerCase() : "all",
    usageLimitTotal: input.usageLimitTotal ?? null,
    usageLimitPerUser: input.usageLimitPerUser ?? null,
    active: input.active ?? true,
  };
}

function mapAssignmentCreateData(
  assignments: DiscountInput["assignments"]
): Prisma.DiscountAssignmentCreateWithoutDiscountInput[] {
  if (!assignments.length) return [];
  return assignments.map((assignment: DiscountAssignmentInput) => ({
    scope: assignment.scope,
    refId: assignment.refId,
  }));
}

function mapExclusionCreateData(
  exclusions: DiscountInput["exclusions"]
): Prisma.DiscountExclusionCreateWithoutDiscountInput[] {
  if (!exclusions.length) return [];
  return exclusions.map((exclusion: DiscountExclusionInput) => ({
    scope: exclusion.scope,
    refId: exclusion.refId,
  }));
}

function mapCouponCreateData(coupons: DiscountInput["coupons"]): Prisma.CouponCreateWithoutDiscountInput[] {
  if (!coupons.length) return [];
  return coupons.map((coupon: DiscountCouponInput) => ({
    code: coupon.code.trim().toUpperCase(),
    maxRedemptions: coupon.maxRedemptions ?? null,
    startsAt: coupon.startsAt ?? null,
    endsAt: coupon.endsAt ?? null,
    metadata: coupon.metadata ? (coupon.metadata as Prisma.InputJsonValue) : undefined,
  }));
}

export async function createDiscount(tx: DiscountTx, input: DiscountInput): Promise<DiscountMutationResult> {
  const couponData = mapCouponCreateData(input.coupons);
  const created = await tx.discount.create({
    data: {
      ...baseDiscountData(input),
      assignments: input.assignments.length ? { create: mapAssignmentCreateData(input.assignments) } : undefined,
      exclusions: input.exclusions.length ? { create: mapExclusionCreateData(input.exclusions) } : undefined,
      coupons: couponData.length ? { create: couponData } : undefined,
    } as Prisma.DiscountCreateInput,
    include: {
      assignments: true,
      exclusions: true,
      coupons: true,
    },
  });
  return created;
}

async function syncAssignments(tx: DiscountTx, discountId: string, input: DiscountInput) {
  await tx.discountAssignment.deleteMany({ where: { discountId } });
  const payload = mapAssignmentCreateData(input.assignments);
  if (payload.length) {
    await tx.discountAssignment.createMany({
      data: payload.map((assignment) => ({ ...assignment, discountId })),
    });
  }
}

async function syncExclusions(tx: DiscountTx, discountId: string, input: DiscountInput) {
  await tx.discountExclusion.deleteMany({ where: { discountId } });
  const payload = mapExclusionCreateData(input.exclusions);
  if (payload.length) {
    await tx.discountExclusion.createMany({
      data: payload.map((exclusion) => ({ ...exclusion, discountId })),
    });
  }
}

async function syncCoupons(tx: DiscountTx, discountId: string, input: DiscountInput) {
  const existing = await tx.coupon.findMany({ where: { discountId } });
  const incomingById = new Map<string, DiscountInput["coupons"][number]>();
  input.coupons.forEach((coupon: DiscountCouponInput) => {
    if (coupon.id) {
      incomingById.set(coupon.id, coupon);
    }
  });

  const toDelete = existing.filter((coupon: any) => !incomingById.has(coupon.id));
  if (toDelete.length) {
    await tx.coupon.deleteMany({
      where: { id: { in: toDelete.map((coupon: any) => coupon.id) } },
    });
  }

  const toUpdate = existing.filter((coupon: any) => incomingById.has(coupon.id));
  for (const coupon of toUpdate as any[]) {
    const next = incomingById.get(coupon.id)!;
    await tx.coupon.update({
      where: { id: coupon.id },
      data: {
        code: next.code.trim().toUpperCase(),
        maxRedemptions: next.maxRedemptions ?? null,
        startsAt: next.startsAt ?? null,
        endsAt: next.endsAt ?? null,
        metadata: next.metadata ? (next.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  const toCreate = input.coupons.filter((coupon: DiscountCouponInput) => !coupon.id);
  if (toCreate.length) {
    await tx.coupon.createMany({
      data: toCreate.map((coupon: DiscountCouponInput) => ({
        discountId,
        code: coupon.code.trim().toUpperCase(),
        maxRedemptions: coupon.maxRedemptions ?? null,
        startsAt: coupon.startsAt ?? null,
        endsAt: coupon.endsAt ?? null,
        metadata: coupon.metadata ? (coupon.metadata as Prisma.InputJsonValue) : undefined,
      })) as Prisma.CouponCreateManyInput[],
    });
  }
}

export async function updateDiscount(
  tx: DiscountTx,
  discountId: string,
  input: DiscountInput
): Promise<DiscountMutationResult> {
  await tx.discount.update({
    where: { id: discountId },
    data: baseDiscountData(input),
  });

  await syncAssignments(tx, discountId, input);
  await syncExclusions(tx, discountId, input);
  await syncCoupons(tx, discountId, input);

  const updated = await tx.discount.findUniqueOrThrow({
    where: { id: discountId },
    include: {
      assignments: true,
      exclusions: true,
      coupons: true,
    },
  });

  return updated;
}
