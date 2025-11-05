import { Prisma } from "@generated/prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/utils/auth/guard";
import { prisma } from "@/lib/prisma";
import { DiscountInputSchema } from "@/lib/discounts";
import { refreshCatalogAfterDiscountChange } from "@/lib/discounts/catalog-sync";
import { updateDiscount } from "../_helpers/mutations";

const STAFF_ROLES = ["admin", "staff"] as const;

type Params = { params: Promise<{ id: string }> };
type DiscountTx = Parameters<typeof updateDiscount>[0];

function formatValidationError(error: ZodError) {
  const fieldErrors = error.flatten().fieldErrors;
  return Object.entries(fieldErrors).map(([field, rawMessages]) => {
    const messages = Array.isArray(rawMessages)
      ? rawMessages.filter((value): value is string => typeof value === "string")
      : [];
    return { field, messages };
  });
}

export async function GET(request: Request, { params }: Params) {
  const auth = await requireAuth(request, { roles: Array.from(STAFF_ROLES) });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const item = await prisma.discount.findUnique({
    where: { id },
    include: { assignments: true, exclusions: true, coupons: true },
  });

  if (!item) {
    return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item });
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth(request, { roles: Array.from(STAFF_ROLES) });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = DiscountInputSchema.safeParse(body);
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
    const item = await prisma.$transaction((tx: DiscountTx) => updateDiscount(tx, id, parsed.data));
    await refreshCatalogAfterDiscountChange(item.assignments);
    return NextResponse.json({ ok: true, item });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          ok: false,
          code: "update_failed",
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: false, code: "unknown_error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAuth(request, { roles: Array.from(STAFF_ROLES) });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  try {
    const deleted = await prisma.discount.delete({
      where: { id },
      include: { assignments: true },
    });
    await refreshCatalogAfterDiscountChange(deleted.assignments);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ ok: false, code: "delete_failed", message: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: false, code: "unknown_error" }, { status: 500 });
  }
}
