-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "discounts";

-- CreateEnum
CREATE TYPE "discounts"."DiscountType" AS ENUM ('percent_off', 'amount_off', 'bogo', 'tiered', 'coupon');

-- CreateEnum
CREATE TYPE "discounts"."AssignmentScope" AS ENUM ('BRAND', 'CATEGORY', 'PRODUCT', 'VENDOR', 'CUSTOMER_GROUP');

-- CreateTable
CREATE TABLE "discounts"."Brand" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts"."Vendor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts"."Category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts"."Product" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" UUID,
    "vendorId" UUID,
    "categoryId" UUID,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts"."Discount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" "discounts"."DiscountType" NOT NULL,
    "description" TEXT,
    "percentOff" DECIMAL(5,4),
    "amountOffCts" INTEGER,
    "currency" TEXT,
    "bogoBuyQty" INTEGER,
    "bogoGetQty" INTEGER,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "minSubtotalCts" INTEGER,
    "minQty" INTEGER,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "channel" TEXT NOT NULL DEFAULT 'all',
    "usageLimitTotal" INTEGER,
    "usageLimitPerUser" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts"."DiscountAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "discountId" UUID NOT NULL,
    "scope" "discounts"."AssignmentScope" NOT NULL,
    "refId" TEXT NOT NULL,

    CONSTRAINT "DiscountAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts"."DiscountExclusion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "discountId" UUID NOT NULL,
    "scope" "discounts"."AssignmentScope" NOT NULL,
    "refId" TEXT NOT NULL,

    CONSTRAINT "DiscountExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts"."Coupon" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" CITEXT NOT NULL,
    "discountId" UUID NOT NULL,
    "maxRedemptions" INTEGER,
    "redemptions" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts"."CouponRedemption" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "couponId" UUID NOT NULL,
    "discountId" UUID NOT NULL,
    "userId" TEXT,
    "orderId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "discounts"."Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "discounts"."Vendor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "discounts"."Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "discounts"."Product"("sku");

CREATE INDEX "Product_brandId_idx" ON "discounts"."Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_vendorId_idx" ON "discounts"."Product"("vendorId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "discounts"."Product"("categoryId");

-- CreateIndex
CREATE INDEX "Discount_active_startAt_endAt_channel_idx" ON "discounts"."Discount"("active", "startAt", "endAt", "channel");

-- CreateIndex
CREATE INDEX "Discount_priority_startAt_idx" ON "discounts"."Discount"("priority", "startAt");

-- CreateIndex
CREATE INDEX "DiscountAssignment_scope_refId_idx" ON "discounts"."DiscountAssignment"("scope", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountAssignment_discountId_scope_refId_key" ON "discounts"."DiscountAssignment"("discountId", "scope", "refId");

-- CreateIndex
CREATE INDEX "DiscountExclusion_scope_refId_idx" ON "discounts"."DiscountExclusion"("scope", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountExclusion_discountId_scope_refId_key" ON "discounts"."DiscountExclusion"("discountId", "scope", "refId");

-- CreateIndex
CREATE INDEX "Coupon_discountId_idx" ON "discounts"."Coupon"("discountId");

-- CreateIndex
CREATE INDEX "Coupon_startsAt_endsAt_idx" ON "discounts"."Coupon"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "discounts"."Coupon"("code");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_redeemedAt_idx" ON "discounts"."CouponRedemption"("couponId", "redeemedAt");

-- CreateIndex
CREATE INDEX "CouponRedemption_discountId_redeemedAt_idx" ON "discounts"."CouponRedemption"("discountId", "redeemedAt");

-- CreateIndex
CREATE INDEX "CouponRedemption_userId_couponId_idx" ON "discounts"."CouponRedemption"("userId", "couponId");

-- AddForeignKey
ALTER TABLE "discounts"."Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "discounts"."Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts"."Product" ADD CONSTRAINT "Product_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "discounts"."Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "discounts"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts"."DiscountAssignment" ADD CONSTRAINT "DiscountAssignment_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"."Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts"."DiscountExclusion" ADD CONSTRAINT "DiscountExclusion_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"."Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts"."Coupon" ADD CONSTRAINT "Coupon_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"."Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts"."CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "discounts"."Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts"."CouponRedemption" ADD CONSTRAINT "CouponRedemption_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"."Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
