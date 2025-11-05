import { AssignmentScope, DiscountType } from "@generated/prisma/client";
import { z } from "zod";

const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "currency must be ISO 4217 code");

const uuidLike = z
  .string()
  .uuid()
  .or(
    z
      .string()
      .trim()
      .min(1)
      .refine((value) => value.length <= 191, "identifier is too long")
  );

export const AssignmentInputSchema = z.object({
  scope: z.nativeEnum(AssignmentScope),
  refId: uuidLike,
});

export const CouponInputSchema = z.object({
  id: z.string().uuid().optional(),
  code: z
    .string()
    .trim()
    .min(1, "Coupon code is required")
    .max(64, "Coupon code is too long"),
  maxRedemptions: z
    .number()
    .int()
    .positive("Max redemptions must be positive")
    .nullable()
    .optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const DiscountInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1000).optional().nullable(),
    type: z.nativeEnum(DiscountType),
    percentOff: z
      .number()
      .positive()
      .max(100)
      .optional()
      .nullable(),
    amountOffCts: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .nullable(),
    currency: currencySchema.optional().nullable(),
    bogoBuyQty: z.number().int().positive().optional().nullable(),
    bogoGetQty: z.number().int().positive().optional().nullable(),
    stackable: z.boolean().optional(),
    priority: z.number().int().min(0).max(1000).default(100),
    minSubtotalCts: z.number().int().nonnegative().optional().nullable(),
    minQty: z.number().int().positive().optional().nullable(),
    startAt: z.coerce.date().nullable().optional(),
    endAt: z.coerce.date().nullable().optional(),
    channel: z.string().trim().min(1).max(64).default("all"),
    usageLimitTotal: z.number().int().positive().optional().nullable(),
    usageLimitPerUser: z.number().int().positive().optional().nullable(),
    active: z.boolean().default(true),
    assignments: z.array(AssignmentInputSchema).default([]),
    exclusions: z.array(AssignmentInputSchema).default([]),
    coupons: z.array(CouponInputSchema).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.percentOff && value.amountOffCts) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountOffCts"],
        message: "Use either percentOff or amountOffCts",
      });
    }

    if ((value.type === "amount_off" || value.type === "coupon") && !value.currency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currency"],
        message: "Currency is required for amount-based discounts",
      });
    }

    if (value.startAt && value.endAt && value.endAt < value.startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "End date must be after start date",
      });
    }

    if (value.type === "coupon" && value.coupons.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coupons"],
        message: "Coupon discounts require at least one coupon code",
      });
    }

    if (value.minSubtotalCts != null && value.minSubtotalCts < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minSubtotalCts"],
        message: "Minimum subtotal must be non-negative",
      });
    }

    if (
      (value.type === "bogo" && (!value.bogoBuyQty || !value.bogoGetQty)) ||
      (value.bogoBuyQty && !value.bogoGetQty) ||
      (value.bogoGetQty && !value.bogoBuyQty)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bogoBuyQty"],
        message: "BOGO discounts require buy and get quantities",
      });
    }
  });

export type DiscountInput = z.infer<typeof DiscountInputSchema>;

export const DiscountQuerySchema = z.object({
  channel: z.string().trim().default("all"),
  now: z.coerce.date().optional(),
  couponCodes: z.array(z.string()).optional(),
});

export const CartItemSchema = z
  .object({
    productId: z.string().uuid().optional(),
    sku: z.string().trim().min(1).optional(),
    quantity: z.number().int().positive().default(1),
    unitPriceCents: z.number().int().nonnegative().optional(),
    currency: currencySchema.optional(),
    brandId: z.string().uuid().optional().nullable(),
    vendorId: z.string().uuid().optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
  })
  .refine((item) => !!item.productId || !!item.sku, {
    message: "Either productId or sku is required",
    path: ["productId"],
  });

export const PricingPreviewInputSchema = z.object({
  channel: z.string().trim().default("web"),
  currency: currencySchema.default("USD"),
  now: z.coerce.date().optional(),
  customerId: z.string().uuid().optional().nullable(),
  customerGroups: z.array(z.string().trim()).optional(),
  couponCodes: z.array(z.string()).optional(),
  items: z.array(CartItemSchema).min(1),
});

export type PricingPreviewInput = z.infer<typeof PricingPreviewInputSchema>;
export type PricingPreviewItemInput = z.infer<typeof CartItemSchema>;

export const CartPricingRequestSchema = PricingPreviewInputSchema.extend({
  commit: z.boolean().default(false),
  orderId: z.string().trim().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CartPricingRequestInput = z.infer<typeof CartPricingRequestSchema>;
