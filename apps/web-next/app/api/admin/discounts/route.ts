import { Prisma } from "@generated/prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/utils/auth/guard";
import { prisma } from "@/lib/prisma";
import { DiscountInputSchema, loadDiscounts } from "@/lib/discounts";
import { refreshCatalogAfterDiscountChange } from "@/lib/discounts/catalog-sync";
import { createDiscount } from "./_helpers/mutations";

const STAFF_ROLES = ["admin", "staff"] as const;

type DiscountTx = Parameters<typeof createDiscount>[0];

function formatValidationError(error: ZodError) {
  const fieldErrors = error.flatten().fieldErrors;
  return Object.entries(fieldErrors).map(([field, rawMessages]) => {
    const messages = Array.isArray(rawMessages)
      ? rawMessages.filter((value): value is string => typeof value === "string")
      : [];
    return { field, messages };
  });
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, { roles: Array.from(STAFF_ROLES) });
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const channel = url.searchParams.get("channel")?.trim().toLowerCase() || "all";
  const includeInactive = url.searchParams.get("includeInactive") === "true";
  const nowParam = url.searchParams.get("now");
  const now = nowParam ? new Date(nowParam) : new Date();

  const items = await loadDiscounts(
    prisma,
    {
      channel,
      now,
      includeInactive,
    },
  );

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, { roles: Array.from(STAFF_ROLES) });
  if ("response" in auth) return auth.response;

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
    const item = await prisma.$transaction((tx: DiscountTx) => createDiscount(tx, parsed.data));
    await refreshCatalogAfterDiscountChange(item.assignments);
    return NextResponse.json({ ok: true, item });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        {
          ok: false,
          code: "duplicate_value",
          message: "A unique constraint was violated",
        },
        { status: 409 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json(
        {
          ok: false,
          code: "create_failed",
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: false, code: "unknown_error" }, { status: 500 });
  }
}
