import uuid

from django.db import models


class DiscountType(models.TextChoices):
    PERCENT_OFF = "percent_off", "Percent Off"
    AMOUNT_OFF = "amount_off", "Amount Off"
    BOGO = "bogo", "BOGO"
    TIERED = "tiered", "Tiered"
    COUPON = "coupon", "Coupon"


class AssignmentScope(models.TextChoices):
    BRAND = "BRAND", "Brand"
    CATEGORY = "CATEGORY", "Category"
    PRODUCT = "PRODUCT", "Product"
    VENDOR = "VENDOR", "Vendor"
    CUSTOMER_GROUP = "CUSTOMER_GROUP", "Customer Group"


class Brand(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(db_column="createdAt", blank=True, null=True)
    updated_at = models.DateTimeField(db_column="updatedAt", blank=True, null=True)

    class Meta:
        db_table = '"discounts"."Brand"'
        managed = False
        ordering = ["name"]

    def __str__(self):
        return self.name


class Vendor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(db_column="createdAt")
    updated_at = models.DateTimeField(db_column="updatedAt")

    class Meta:
        db_table = '"discounts"."Vendor"'
        managed = False
        ordering = ["name"]

    def __str__(self):
        return self.name


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(db_column="createdAt")
    updated_at = models.DateTimeField(db_column="updatedAt")

    class Meta:
        db_table = '"discounts"."Category"'
        managed = False
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    id = models.UUIDField(primary_key=True, editable=False)
    sku = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    price_cents = models.IntegerField(db_column="priceCents")
    currency = models.CharField(max_length=3)
    updated_at = models.DateTimeField(db_column="updatedAt")

    class Meta:
        db_table = '"public"."product"'
        managed = False
        ordering = ["name"]

    def __str__(self):
        return self.name


class CatalogProduct(models.Model):
    id = models.UUIDField(primary_key=True, editable=False)
    slug = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    rating = models.FloatField(blank=True, null=True)
    images = models.JSONField(default=list, blank=True, null=True)
    category_slug = models.CharField(max_length=255, blank=True, null=True)
    tags = models.JSONField(default=list, blank=True, null=True)
    short_desc = models.TextField(blank=True, null=True)
    specs = models.JSONField(default=dict, blank=True, null=True)
    created_at = models.DateTimeField(db_column="created_at")
    status = models.CharField(max_length=64)
    sku = models.CharField(max_length=255)
    image_path = models.CharField(max_length=255, blank=True, null=True)
    currency = models.CharField(max_length=8, blank=True, null=True)
    seller_id = models.UUIDField(blank=True, null=True, db_column="seller_id")
    to_delete = models.BooleanField(blank=True, null=True)
    status_lc = models.CharField(max_length=64, blank=True, null=True, db_column="status_lc")
    deleted_at = models.DateTimeField(blank=True, null=True, db_column="deleted_at")
    description = models.TextField(blank=True, null=True)
    main_image_url = models.CharField(max_length=1024, blank=True, null=True, db_column="main_image_url")
    price_cents = models.BigIntegerField(blank=True, null=True, db_column="price_cents")

    class Meta:
        db_table = '"public"."ecom_products"'
        managed = False
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Discount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=32, choices=DiscountType.choices)
    description = models.TextField(blank=True, null=True)
    percent_off = models.DecimalField(
        db_column="percentOff", max_digits=5, decimal_places=4, blank=True, null=True
    )
    amount_off_cts = models.IntegerField(db_column="amountOffCts", blank=True, null=True)
    currency = models.CharField(max_length=3, blank=True, null=True)
    bogo_buy_qty = models.IntegerField(db_column="bogoBuyQty", blank=True, null=True)
    bogo_get_qty = models.IntegerField(db_column="bogoGetQty", blank=True, null=True)
    stackable = models.BooleanField(default=False)
    priority = models.IntegerField(default=100)
    min_subtotal_cts = models.IntegerField(db_column="minSubtotalCts", blank=True, null=True)
    min_qty = models.IntegerField(blank=True, null=True, db_column="minQty")
    start_at = models.DateTimeField(db_column="startAt", blank=True, null=True)
    end_at = models.DateTimeField(db_column="endAt", blank=True, null=True)
    channel = models.CharField(max_length=128, blank=True, default="all")
    usage_limit_total = models.IntegerField(db_column="usageLimitTotal", blank=True, null=True)
    usage_limit_per_user = models.IntegerField(
        db_column="usageLimitPerUser", blank=True, null=True
    )
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(db_column="createdAt")
    updated_at = models.DateTimeField(db_column="updatedAt")

    class Meta:
        db_table = '"discounts"."Discount"'
        managed = False
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class DiscountAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    discount = models.ForeignKey(
        Discount,
        db_column="discountId",
        related_name="assignments",
        on_delete=models.DO_NOTHING,
        db_constraint=False,
    )
    scope = models.CharField(max_length=32, choices=AssignmentScope.choices)
    ref_id = models.CharField(db_column="refId", max_length=255)

    class Meta:
        db_table = '"discounts"."DiscountAssignment"'
        managed = False
        ordering = ["scope", "ref_id"]

    def __str__(self):
        return f"Assignment {self.scope}:{self.ref_id}"


class DiscountExclusion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    discount = models.ForeignKey(
        Discount,
        db_column="discountId",
        related_name="exclusions",
        on_delete=models.DO_NOTHING,
        db_constraint=False,
    )
    scope = models.CharField(max_length=32, choices=AssignmentScope.choices)
    ref_id = models.CharField(db_column="refId", max_length=255)

    class Meta:
        db_table = '"discounts"."DiscountExclusion"'
        managed = False
        ordering = ["scope", "ref_id"]

    def __str__(self):
        return f"Exclusion {self.scope}:{self.ref_id}"


class Coupon(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=128, unique=True)
    discount = models.ForeignKey(
        Discount,
        db_column="discountId",
        related_name="coupons",
        on_delete=models.DO_NOTHING,
        db_constraint=False,
    )
    max_redemptions = models.IntegerField(db_column="maxRedemptions", blank=True, null=True)
    redemption_count = models.IntegerField(db_column="redemptions")
    metadata = models.JSONField(blank=True, null=True)
    starts_at = models.DateTimeField(db_column="startsAt", blank=True, null=True)
    ends_at = models.DateTimeField(db_column="endsAt", blank=True, null=True)

    class Meta:
        db_table = '"discounts"."Coupon"'
        managed = False
        ordering = ["code"]

    def __str__(self):
        return self.code


class CouponRedemption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coupon = models.ForeignKey(
        Coupon,
        db_column="couponId",
        related_name="redemptions_log",
        on_delete=models.DO_NOTHING,
        db_constraint=False,
        blank=True,
        null=True,
    )
    discount = models.ForeignKey(
        Discount,
        db_column="discountId",
        related_name="redemptions",
        on_delete=models.DO_NOTHING,
        db_constraint=False,
    )
    user_id = models.CharField(db_column="userId", max_length=255, blank=True, null=True)
    order_id = models.CharField(db_column="orderId", max_length=255, blank=True, null=True)
    amount_cents = models.IntegerField(db_column="amountCents")
    currency = models.CharField(max_length=3)
    redeemed_at = models.DateTimeField(db_column="redeemedAt")
    metadata = models.JSONField(blank=True, null=True)

    class Meta:
        db_table = '"discounts"."CouponRedemption"'
        managed = False
        ordering = ["-redeemed_at"]

    def __str__(self):
        return f"Redemption {self.id}"
