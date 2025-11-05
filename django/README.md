# Discounts Admin (Django)

Lightweight Django Admin to browse and safely edit discounts and coupons stored in Supabase Postgres. Prisma remains the single owner of schema and migrations; Django never creates/changes/drops DB objects.

## Quickstart

- Create and activate a Python venv
- Install deps: `pip install -r django/requirements.txt`
- Set env vars:
  - `export DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB?sslmode=require`
  - Optional UI locale: `export DJANGO_LANGUAGE=ru` (по умолчанию админка открывается на русском)
  - Optional: `export ADMIN_SAFE_EDIT=1` to allow creating/updating Discount and Coupon
- Run: `python django/manage.py runserver`

## Settings highlights

- App: `discounts_admin`
- SSL required (dj-database-url with `ssl_require=True`)
- DB `OPTIONS.options`: `-c statement_timeout=5000 -c search_path=discounts,public`
- Feature flag: `ADMIN_SAFE_EDIT` (unset = read-only)
- Built-in locales: English (`en`) and Russian (`ru`). Можно переключать язык через POST на `/i18n/setlang/` или параметр `DJANGO_LANGUAGE`.

## Models (managed=False)

- Maps to existing tables in schema `discounts` with quoted `db_table` names:
  - `"discounts"."Brand"`, `"Vendor"`, `"Category"`
- Discounts `Product` references view `public.product` for assignment metadata (`db_table = '"public"."product"'`)
  - View сейчас указывает на активные товары каталога (`public.ecom_products`), поэтому в списке видны только опубликованные позиции
- Каталожные товары (`CatalogProduct`) читаются из `public.ecom_products` (в Supabase это основная таблица витрины)
  - `"Discount"`, `"DiscountAssignment"`, `"DiscountExclusion"`
  - `"Coupon"`, `"CouponRedemption"`
- `Meta.managed=False` on all models; no migrations should be created or applied for this app.
- ForeignKeys use `on_delete=DO_NOTHING` and `db_constraint=False` to avoid cross-schema FK issues.

## Admin behavior

- Default (feature flag off): read-only, no add/change/delete across all models. Inlines are read-only.
- When `ADMIN_SAFE_EDIT=1`:
  - Discount: editable fields include `name, description, channel, priority, active, start_at, end_at, percent_off, amount_off_cts, currency, bogo_buy_qty, bogo_get_qty, min_subtotal_cts, min_qty, usage_limit_total, usage_limit_per_user`. `id/created_at/updated_at` remain read-only. Delete is disabled.
  - Coupon: editable fields include `discount, code, active, max_redemptions, starts_at, ends_at, metadata`. Redemptions are read-only. Delete is disabled.
  - Assignments/Exclusions/CouponRedemptions are exposed as read-only inlines.

## Validation

Implemented in `DiscountAdmin` via a ModelForm:
- `percent_off` and `amount_off_cts` are mutually exclusive.
- If neither is set, BOGO fields (`bogo_buy_qty` and `bogo_get_qty`) must be set.
- `start_at <= end_at` when both provided.
- `percent_off` must be within `0..1`.

## Optional: CSV export

- `python django/manage.py export_discounts --output discounts.csv`

## Permissions (to run in Supabase as admin)

Create a dedicated DB role with access only to the `discounts` schema. Do not run these from Django; apply via SQL console as an admin/service role.

```
create role django_admin login password 'REDACTED';
grant usage on schema discounts to django_admin;
grant select, insert, update on all tables in schema discounts to django_admin;
alter default privileges in schema discounts grant select, insert, update on tables to django_admin;
```

If RLS is enabled on `discounts` tables, ensure `django_admin` has permissive policies or connect with the Supabase service role. Do not create policies from Django.

## Notes

- Prisma continues to manage schema via Node; Django Admin only reads/writes rows. Keep deletes disabled to avoid breaking invariants.
- Do not run `makemigrations` for `discounts_admin`. No migrations are shipped for these models.
- The DB models use UUID PKs and JSON fields where appropriate.
