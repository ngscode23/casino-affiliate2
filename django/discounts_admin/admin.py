from django.conf import settings
from django.contrib import admin
from django import forms
from django.core.exceptions import ValidationError
from django.utils import timezone

from . import models as m


class ReadOnlyMixin:
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        if self.readonly_fields:
            return self.readonly_fields
        # make every field readonly by default
        return [f.name for f in self.model._meta.fields] + [
            f.name for f in self.model._meta.many_to_many
        ]


class SafeEditMixin:
    # Default: deny delete completely
    def has_delete_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        return bool(getattr(settings, "ADMIN_SAFE_EDIT", False))

    def has_change_permission(self, request, obj=None):
        return bool(getattr(settings, "ADMIN_SAFE_EDIT", False))

    def get_readonly_fields(self, request, obj=None):
        # When flag is off, everything is readonly
        if not getattr(settings, "ADMIN_SAFE_EDIT", False):
            return [f.name for f in self.model._meta.fields] + [
                f.name for f in self.model._meta.many_to_many
            ]
        # Otherwise, honor subclass-defined readonly_fields
        return super().get_readonly_fields(request, obj)


class SafeInlineMixin:
    def has_add_permission(self, request, obj=None):
        return bool(getattr(settings, "ADMIN_SAFE_EDIT", False))

    def has_change_permission(self, request, obj=None):
        return bool(getattr(settings, "ADMIN_SAFE_EDIT", False))

    def has_delete_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        base = []
        if hasattr(super(), "get_readonly_fields"):
            base = list(super().get_readonly_fields(request, obj))
        else:
            base = list(getattr(self, "readonly_fields", []))

        if getattr(settings, "ADMIN_SAFE_EDIT", False):
            return tuple(base)

        model_fields = [f.name for f in self.model._meta.fields]
        return tuple(dict.fromkeys(base + model_fields))

    def get_extra(self, request, obj=None, **kwargs):
        return 1 if getattr(settings, "ADMIN_SAFE_EDIT", False) else 0


class DiscountForm(forms.ModelForm):
    class Meta:
        model = m.Discount
        fields = "__all__"

    def clean(self):
        cleaned = super().clean()
        percent_off = cleaned.get("percent_off")
        amount_off_cts = cleaned.get("amount_off_cts")
        discount_type = cleaned.get("type")
        bogo_buy_qty = cleaned.get("bogo_buy_qty")
        bogo_get_qty = cleaned.get("bogo_get_qty")
        start_at = cleaned.get("start_at")
        end_at = cleaned.get("end_at")
        channel = (cleaned.get("channel") or "").strip()
        priority = cleaned.get("priority")
        created_at = cleaned.get("created_at")
        updated_at = cleaned.get("updated_at")

        # percent_off must be between 0 and 1
        if percent_off is not None:
            try:
                if percent_off < 0 or percent_off > 1:
                    raise ValidationError({
                        "percent_off": "percent_off must be between 0 and 1."
                    })
            except TypeError:
                raise ValidationError({"percent_off": "Invalid percent_off value."})

        has_pct = bool(percent_off) and float(percent_off) > 0
        has_amt = bool(amount_off_cts) and int(amount_off_cts) > 0
        has_bogo = bool(bogo_buy_qty) and bool(bogo_get_qty)

        # Mutual exclusivity for amount and percent
        if has_pct and has_amt:
            raise ValidationError(
                "percent_off and amount_off_cts are mutually exclusive"
            )

        # Enforce requirements based on type
        if discount_type == "percent_off":
            if not has_pct:
                raise ValidationError({"percent_off": "Required for percent_off discounts."})
            if has_amt:
                raise ValidationError({"amount_off_cts": "Do not set amount_off_cts for percent_off discounts."})
        elif discount_type == "amount_off":
            if not has_amt:
                raise ValidationError({"amount_off_cts": "Required for amount_off discounts."})
            if has_pct:
                raise ValidationError({"percent_off": "Do not set percent_off for amount_off discounts."})
        elif discount_type == "bogo":
            if not has_bogo:
                raise ValidationError("BOGO discounts require bogo_buy_qty and bogo_get_qty.")
        else:
            # Default safety: require some kind of value
            if not has_pct and not has_amt and not has_bogo:
                raise ValidationError(
                    "Provide either percent_off or amount_off_cts, unless BOGO quantities are provided."
                )

        # Time window validation
        if start_at and end_at and start_at > end_at:
            raise ValidationError("start_at must be before or equal to end_at")

        # normalize channel / priority defaults
        cleaned["channel"] = channel.lower() if channel else "all"
        cleaned["priority"] = priority if priority is not None else 100
        cleaned["created_at"] = created_at or timezone.now()
        cleaned["updated_at"] = updated_at or timezone.now()

        return cleaned

    def save(self, commit=True):
        instance = super().save(commit=False)
        now = timezone.now()
        if not instance.created_at:
            instance.created_at = now
        instance.updated_at = now
        if commit:
            instance.save()
            self.save_m2m()
        return instance


class DiscountAssignmentInline(SafeInlineMixin, admin.TabularInline):
    model = m.DiscountAssignment
    extra = 0
    can_delete = False
    fields = ("scope", "ref_id", "id")
    readonly_fields = ("id",)


class DiscountExclusionInline(SafeInlineMixin, admin.TabularInline):
    model = m.DiscountExclusion
    extra = 0
    can_delete = False
    fields = ("scope", "ref_id", "id")
    readonly_fields = ("id",)


class CouponInline(admin.TabularInline, ReadOnlyMixin):
    model = m.Coupon
    extra = 0
    can_delete = False
    readonly_fields = (
        "id",
        "code",
        "max_redemptions",
        "redemption_count",
        "starts_at",
        "ends_at",
    )


@admin.register(m.Discount)
class DiscountAdmin(SafeEditMixin, admin.ModelAdmin):
    form = DiscountForm

    list_display = (
        "name",
        "type",
        "active",
        "channel",
        "priority",
        "start_at",
        "end_at",
        "stackable",
    )
    list_filter = ("active", "type", "channel", "currency")
    search_fields = ("name", "description")
    inlines = [DiscountAssignmentInline, DiscountExclusionInline, CouponInline]

    readonly_fields = ("id", "stackable", "created_at", "updated_at")

    # Only allow editing a safe subset when enabled
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "name",
                    "description",
                    "type",
                    "channel",
                    "priority",
                    "active",
                    "start_at",
                    "end_at",
                )
            },
        ),
        (
            "Discount",
            {
                "fields": (
                    "percent_off",
                    "amount_off_cts",
                    "currency",
                    "bogo_buy_qty",
                    "bogo_get_qty",
                    "stackable",
                    "min_subtotal_cts",
                    "min_qty",
                    "usage_limit_total",
                    "usage_limit_per_user",
                )
            },
        ),
        ("System", {"classes": ("collapse",), "fields": ("id", "created_at", "updated_at")}),
    )


class CouponRedemptionInline(admin.TabularInline, ReadOnlyMixin):
    model = m.CouponRedemption
    extra = 0
    can_delete = False
    readonly_fields = (
        "id",
        "redeemed_at",
        "user_id",
        "order_id",
        "amount_cents",
        "currency",
        "metadata",
    )


@admin.register(m.Coupon)
class CouponAdmin(SafeEditMixin, admin.ModelAdmin):
    list_display = (
        "code",
        "discount",
        "starts_at",
        "ends_at",
        "max_redemptions",
        "redemption_count",
    )
    list_filter = ("discount",)
    search_fields = ("code",)
    inlines = [CouponRedemptionInline]
    readonly_fields = ("id", "redemption_count")

    # Allow editing safe subset when enabled; include discount to allow linking
    fields = (
        "discount",
        "code",
        "max_redemptions",
        "redemption_count",
        "starts_at",
        "ends_at",
        "metadata",
        "id",
    )


# Read-only registrations for reference tables
@admin.register(m.Brand)
class BrandAdmin(ReadOnlyMixin, admin.ModelAdmin):
    list_display = ("name", "id")
    search_fields = ("name",)


@admin.register(m.Vendor)
class VendorAdmin(ReadOnlyMixin, admin.ModelAdmin):
    list_display = ("name", "id")
    search_fields = ("name",)


@admin.register(m.Category)
class CategoryAdmin(ReadOnlyMixin, admin.ModelAdmin):
    list_display = ("name", "id")
    search_fields = ("name",)


@admin.register(m.Product)
class ProductAdmin(ReadOnlyMixin, admin.ModelAdmin):
    list_display = (
        "name",
        "sku",
        "price_cents",
        "currency",
        "updated_at",
    )
    search_fields = ("name", "sku")


@admin.register(m.CatalogProduct)
class CatalogProductAdmin(ReadOnlyMixin, admin.ModelAdmin):
    list_display = (
        "title",
        "slug",
        "sku",
        "status",
        "price",
        "currency",
        "rating",
        "created_at",
    )
    list_filter = ("status", "currency", "category_slug", "to_delete")
    search_fields = ("title", "slug", "sku")


@admin.register(m.DiscountAssignment)
class DiscountAssignmentAdmin(ReadOnlyMixin, admin.ModelAdmin):
    list_display = ("discount", "scope", "ref_id")
    list_filter = ("scope",)
    search_fields = ("discount__name", "ref_id")


@admin.register(m.DiscountExclusion)
class DiscountExclusionAdmin(ReadOnlyMixin, admin.ModelAdmin):
    list_display = ("discount", "scope", "ref_id")
    list_filter = ("scope",)
    search_fields = ("discount__name", "ref_id")


@admin.register(m.CouponRedemption)
class CouponRedemptionAdmin(ReadOnlyMixin, admin.ModelAdmin):
    list_display = (
        "coupon",
        "discount",
        "redeemed_at",
        "amount_cents",
        "currency",
        "user_id",
        "order_id",
    )
    search_fields = ("coupon__code", "discount__name", "user_id", "order_id")
