import { PrismaClient, DiscountType, AssignmentScope } from "../generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Wipe existing sample data to keep seed idempotent in local envs
  await prisma.couponRedemption.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.discountExclusion.deleteMany();
  await prisma.discountAssignment.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.category.deleteMany();

  const [brandAcme, brandLucky] = await prisma.$transaction([
    prisma.brand.create({ data: { name: "Acme Games" } }),
    prisma.brand.create({ data: { name: "Lucky Spin" } }),
  ]);

  const [vendorNeon, vendorPrime] = await prisma.$transaction([
    prisma.vendor.create({ data: { name: "Neon Casino" } }),
    prisma.vendor.create({ data: { name: "Prime Slots" } }),
  ]);

  const [categorySlots, categoryRoulette] = await prisma.$transaction([
    prisma.category.create({ data: { name: "Slots" } }),
    prisma.category.create({ data: { name: "Roulette" } }),
  ]);

  const [productStarBurst, productMegaRoulette, productLucky777] = await prisma.$transaction([
    prisma.product.create({
      data: {
        sku: "ACME-SLOT-001",
        name: "Star Burst Deluxe",
        brandId: brandAcme.id,
        vendorId: vendorNeon.id,
        categoryId: categorySlots.id,
        priceCents: 2999,
        currency: "EUR",
      },
    }),
    prisma.product.create({
      data: {
        sku: "LUCKY-ROULETTE-001",
        name: "Mega Roulette Pro",
        brandId: brandLucky.id,
        vendorId: vendorPrime.id,
        categoryId: categoryRoulette.id,
        priceCents: 4999,
        currency: "EUR",
      },
    }),
    prisma.product.create({
      data: {
        sku: "ACME-SLOT-007",
        name: "Lucky 777 Turbo",
        brandId: brandAcme.id,
        vendorId: vendorNeon.id,
        categoryId: categorySlots.id,
        priceCents: 2599,
        currency: "EUR",
      },
    }),
  ]);

  const brandPercentDiscount = await prisma.discount.create({
    data: {
      name: "-10% для игр Acme",
      type: DiscountType.percent_off,
      percentOff: 10,
      stackable: false,
      priority: 50,
      channel: "web",
      assignments: {
        create: [{ scope: AssignmentScope.BRAND, refId: brandAcme.id }],
      },
    },
    include: { assignments: true },
  });

  const productFixedDiscount = await prisma.discount.create({
    data: {
      name: "-5 EUR на Mega Roulette",
      type: DiscountType.amount_off,
      amountOffCts: 500,
      currency: "EUR",
      stackable: true,
      priority: 60,
      channel: "web",
      assignments: {
        create: [{ scope: AssignmentScope.PRODUCT, refId: productMegaRoulette.id }],
      },
    },
  });

  const couponDiscount = await prisma.discount.create({
    data: {
      name: "WELCOME купон",
      type: DiscountType.coupon,
      percentOff: 15,
      stackable: true,
      priority: 40,
      channel: "all",
      usageLimitTotal: 1000,
      coupons: {
        create: [{ code: "WELCOME15", maxRedemptions: 100 }],
      },
      exclusions: {
        create: [{ scope: AssignmentScope.CATEGORY, refId: categoryRoulette.id }],
      },
    },
  });

  const bogoDiscount = await prisma.discount.create({
    data: {
      name: "2 по цене 1 на Lucky 777",
      type: DiscountType.bogo,
      bogoBuyQty: 1,
      bogoGetQty: 1,
      stackable: false,
      priority: 30,
      channel: "web",
      assignments: {
        create: [{ scope: AssignmentScope.PRODUCT, refId: productLucky777.id }],
      },
    },
  });

  console.log("Seeded discounts:");
  console.table([
    { id: brandPercentDiscount.id, name: brandPercentDiscount.name },
    { id: productFixedDiscount.id, name: productFixedDiscount.name },
    { id: couponDiscount.id, name: couponDiscount.name },
    { id: bogoDiscount.id, name: bogoDiscount.name },
  ]);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
