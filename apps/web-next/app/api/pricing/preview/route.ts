import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { previewPricing, PricingPreviewInputSchema } from "@/lib/discounts";
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
  const parsed = PricingPreviewInputSchema.safeParse(body);

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
    const { evaluation, items } = await previewPricing(prisma, parsed.data);

    return NextResponse.json({
      ok: true,
      currency: parsed.data.currency,
      subtotalBeforeCents: evaluation.subtotalBeforeCents,
      subtotalAfterCents: evaluation.subtotalAfterCents,
      totalDiscountCents: evaluation.totalDiscountCents,
      items: evaluation.breakdown,
      applied: evaluation.applied,
      requestedItems: items,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          ok: false,
          code: "evaluation_error",
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
