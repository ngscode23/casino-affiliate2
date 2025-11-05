import { describe, expect, test, vi } from "vitest";
import { evaluateDiscounts } from "@/lib/discounts/evaluator";

vi.mock("@generated/prisma/client", () => ({
  Prisma: {
    Decimal: class Decimal {
      value: number;
      constructor(value: number | string) {
        this.value = Number(value);
      }
      valueOf() {
        return this.value;
      }
    },
  },
}));

type DiscountLike = Record<string, any>;
type CouponUsageSnapshot = {
  couponId: string;
  discountId: string;
  totalRedemptions: number;
  userRedemptions: number;
};
type DiscountUsageSnapshot = {
  discountId: string;
  totalRedemptions: number;
  userRedemptions: number;
};

function makeDiscount(partial: Partial<DiscountLike>): DiscountLike {
  const now = new Date();
  return {
    id: partial.id ?? "discount",
    name: partial.name ?? "Test discount",
    type: partial.type ?? "percent_off",
    description: partial.description ?? null,
    percentOff: partial.percentOff ?? (10 as any),
    amountOffCts: partial.amountOffCts ?? null,
    currency: partial.currency ?? "USD",
    bogoBuyQty: partial.bogoBuyQty ?? null,
    bogoGetQty: partial.bogoGetQty ?? null,
    stackable: partial.stackable ?? false,
    priority: partial.priority ?? 100,
    minSubtotalCts: partial.minSubtotalCts ?? null,
    minQty: partial.minQty ?? null,
    startAt: partial.startAt ?? now,
    endAt: partial.endAt ?? null,
    channel: partial.channel ?? "all",
    usageLimitTotal: partial.usageLimitTotal ?? null,
    usageLimitPerUser: partial.usageLimitPerUser ?? null,
    active: partial.active ?? true,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    assignments: partial.assignments ?? [],
    exclusions: partial.exclusions ?? [],
    coupons: partial.coupons ?? [],
  } as DiscountLike;
}

function createContext(overrides: Record<string, unknown> = {}): any {
  return {
    now: new Date(),
    channel: "web",
    currency: "USD",
    customerId: "user-1",
    customerGroups: [],
    couponCodes: [],
    items: [
      {
        productId: "prod-1",
        sku: "sku-1",
        quantity: 1,
        unitPriceCents: 1000,
        currency: "USD",
      },
    ],
    ...overrides,
  };
}

describe("evaluateDiscounts", () => {

  test("applies discounts respecting priority and stackable flag", () => {
    const context = createContext();

    const percent = makeDiscount({
      id: "percent",
      name: "10%",
      type: "percent_off",
      percentOff: 10 as any,
      stackable: true,
      priority: 10,
      startAt: context.now,
    });
    const amount = makeDiscount({
      id: "amount",
      name: "-200",
      type: "amount_off",
      percentOff: null,
      amountOffCts: 200,
      stackable: false,
      priority: 20,
      startAt: context.now,
    });

    const result = evaluateDiscounts([percent, amount], context);

    expect(result.subtotalBeforeCents).toBe(1000);
    expect(result.subtotalAfterCents).toBe(700);
    expect(result.applied.map((discount) => discount.id)).toEqual([
      "percent",
      "amount",
    ]);
  });

  test("skips coupons that exceeded per-user usage limit", () => {
    const context = createContext({ couponCodes: ["SAVE15"] });

    const couponDiscount = makeDiscount({
      id: "coupon",
      type: "coupon",
      percentOff: 15 as any,
      stackable: true,
      usageLimitPerUser: 1,
      startAt: context.now,
      coupons: [
        {
          id: "coupon-1",
          code: "SAVE15",
          discountId: "coupon",
          maxRedemptions: null,
          redemptions: 0,
          metadata: null,
          startsAt: null,
          endsAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const couponUsage: CouponUsageSnapshot[] = [
      {
        couponId: "coupon-1",
        discountId: "coupon",
        totalRedemptions: 1,
        userRedemptions: 1,
      },
    ];

    const discountUsage: DiscountUsageSnapshot[] = [
      {
        discountId: "coupon",
        totalRedemptions: 1,
        userRedemptions: 1,
      },
    ];

    const result = evaluateDiscounts([couponDiscount], context, {
      couponUsage,
      discountUsage,
    });

    expect(result.applied).toHaveLength(0);
    expect(result.subtotalAfterCents).toBe(result.subtotalBeforeCents);
  });
});
