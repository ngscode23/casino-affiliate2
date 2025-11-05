import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CartPricingError, CartPricingRequestSchema, priceCart } from "@/lib/discounts";
import { prisma } from "@/lib/prisma";

function formatValidationError(error: ZodError) {
  const fieldErrors = error.flatten().fieldErrors;
  return Object.entries(fieldErrors).map(([field, rawMessages]) => {
    const messages = Array.isArray(rawMessages)
      ? rawMessages.filter((value): value is string => typeof value === "string")
      : [];
    return { field, messages };
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = CartPricingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "validation_error",
        errors: formatValidationError(parsed.error),
      },
      { status: 400 }
    );
  }

  try {
    const result = await priceCart(prisma, parsed.data);
    return NextResponse.json({
      ok: true,
      committed: result.committed,
      currency: parsed.data.currency,
      subtotalBeforeCents: result.evaluation.subtotalBeforeCents,
      subtotalAfterCents: result.evaluation.subtotalAfterCents,
      totalDiscountCents: result.evaluation.totalDiscountCents,
      items: result.evaluation.breakdown,
      applied: result.evaluation.applied,
      redemptions: result.redemptions,
    });
  } catch (error) {
    if (error instanceof CartPricingError) {
      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          message: error.message,
        },
        { status: error.status }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          ok: false,
          code: "cart_pricing_error",
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "unexpected_error",
      },
      { status: 500 }
    );
  }
}
