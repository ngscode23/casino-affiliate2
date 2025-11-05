ALTER TABLE "discounts"."CouponRedemption" DROP CONSTRAINT IF EXISTS "CouponRedemption_couponId_fkey";

ALTER TABLE "discounts"."CouponRedemption"
  ALTER COLUMN "couponId" DROP NOT NULL;

ALTER TABLE "discounts"."CouponRedemption"
  ADD CONSTRAINT "CouponRedemption_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "discounts"."Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
