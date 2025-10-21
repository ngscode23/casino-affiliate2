# Casino Affiliate Monorepo (Next.js + Supabase)

Production-ready affiliate starter delivered as a pnpm + Turborepo monorepo. The workspace now ships a single Next.js application (public site + admin) while sharing UI, state, and types through reusable packages.

## Monorepo Layout
- `apps/web-next` - customer-facing site + admin (Next.js App Router)
- `packages/ui` – shared UI components and styles
- `packages/shared` – reusable hooks, context providers, Supabase helpers, e-commerce logic
- `packages/types` – shared TypeScript types (DB, DTOs)
- `infra/supabase` – migrations, seed scripts, config

## Requirements
- Node 20+
- pnpm 9+
- Supabase project (URL + Publishable + Service role keys)
- Optional: background job runner (Supabase cron / external scheduler) for nightly maintenance RPCs

## Install & Workspace Scripts
```bash
pnpm install          # install once at repo root
pnpm dev:web-next     # run Next.js app on http://localhost:3000

pnpm build            # turbo orchestrated build (web-next)
pnpm test             # run vitest in apps that define tests
pnpm lint             # eslint across workspace
pnpm typecheck        # tsc project-wide
```
Scripts are defined at the workspace root and proxied through Turborepo. Use `pnpm --filter <pkg> <cmd>` to run package-specific scripts (e.g. `pnpm --filter web-next lint`).

## Supabase
- All migrations live under `infra/supabase/migrations`
- Seed & helper SQL in `infra/supabase/*.sql`
- Keep local CLI state isolated via `.temp/`

Apply migrations with the Supabase CLI or Studio. Example:
```bash
cd infra/supabase
supabase db push
```

## CI/CD
- Add GitHub Actions (example: `.github/workflows/ci.yml`) that run `pnpm install`, `pnpm lint`, `pnpm test`, `pnpm build`
- Protect the main branch by requiring the CI workflow
- Changesets is configured in `.changeset/config.json`; release tags follow `web-next@1.0.0`, `ui@0.1.0`, etc.

## Shared Packages
- `@ui/*` – UI surface (layout, common atoms/molecules, admin widgets)
- `@shared/*` – state and data utilities (Supabase clients, analytics, contexts, e-commerce logic)
- `@types/*` – central type definitions

Use the aliases in any workspace package:
```ts
import Button from "@ui/components/common/button";
import { supabase } from "@shared/lib/supabase";
import type { Offer } from "@types/offer";
```

## Feature Highlights
- Server redirect `/go/:slug` with tracking + RLS
- Admin analytics (clicks, orders, CTR, exports)
- i18n (RU/EN) with consent-gated analytics
- E-commerce wishlist, cart, and reviews via Next.js server routes
- Stripe subscriptions + customer portal integrations
- Supabase policies and scheduled jobs (cleanup, expire partners)

## Environment Variables
Define env values per app via `.env.local`. Shared examples live in `.env.example`. Frontend-visible keys use the `NEXT_PUBLIC_...` prefix; server-only keys keep their raw names (`SUPABASE_...`, `STRIPE_...`).

## Tests
`apps/web-next` contains unit tests powered by Vitest (`pnpm --filter web-next test`). Additional specs can be added per app. Shared utilities live with their source so aliases resolve consistently.

---

The rest of this document retains the original feature documentation for quick reference. Update examples to point at the new package aliases (`@ui/*`, `@shared/*`, `@types/*`) and Supabase scripts under `infra/supabase`.

## Features
- Server redirect `/go/:slug` with UTM/Ref/UA/IP hash logging (RLS enabled)
- Analytics `/admin/analytics`: clicks by day, top slugs, top sources, UTM report, CSV export
- SEO: canonical + hreflang (en/ru), og:locale, JSON-LD (Organization sitewide, Product/Offer + Breadcrumb + FAQ on offers)
- i18n RU/EN with URL param `?lang=` and toggle in header
- Onboarding `/admin/setup` to configure branding + GA without modifying code

### Cookie consent (privacy-first)
- Consent is stored in localStorage under key `cookie-consent-v1`
- GA and Sentry initialize only after user grants analytics consent
- Component `@ui/components/layout/CookieBar.tsx` shows banner and emits `consent:changed`
- GA loader: `@ui/components/AnalyticsGateGA.tsx` (defers `gtag.js` until consent)
- Sentry gating: `@shared/lib/sentry.ts` initialized from `apps/web-next/components/site-layout.client.tsx`
- Toggle from footer: "Cookie settings" link opens the banner to change decision

### Analytics flags
- `NEXT_PUBLIC_GA_ID` or `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `NEXT_PUBLIC_SENTRY_DSN` (optional). Sampling is limited and only runs after consent
- `NEXT_PUBLIC_FEATURE_POSTHOG` (default false): enables PostHog when consent is granted and key present

### Paid placements (Stripe)
- Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_FEATURED`, `STRIPE_PRICE_TOP`
- Create Prices in Stripe (Products → Prices) and copy `price_...` IDs to env
- Create Webhook endpoint: `https://<your-site>/api/payments/webhook` and paste signing secret to `STRIPE_WEBHOOK_SECRET`
- Schedule the `expire_partner_pins` RPC (Supabase cron or external job) to unpin expired offers

E2E test
- Open `/admin/partners` → Create Checkout (choose plan, duration, slugs)
- Complete Stripe test payment → webhook upserts `partners` and `partner_offers` (pinned=true), sets `expires_at`
- Pinned offers appear on top of `/offers`
- After expiration, pins are removed by `expire-partners`

### Subscriptions + Customer Portal
- Env (add to `.env`):
  - `STRIPE_PRICE_BASIC_MONTHLY`, `STRIPE_PRICE_FEATURED_MONTHLY`, `STRIPE_PRICE_TOP_MONTHLY`
  - `STRIPE_PRICE_BASIC_YEARLY`, `STRIPE_PRICE_FEATURED_YEARLY`, `STRIPE_PRICE_TOP_YEARLY`
  - `STRIPE_CUSTOMER_PORTAL_URL` (optional override for portal return URL)
- API routes:
  - `/api/create-subscription` - POST `{ email, plan, interval, coupon? }` - returns `{ url }` (Checkout Session)
  - `/api/customer-portal` - POST `{ email }` - returns `{ url }` (Billing Portal)
- Webhook updates `partners.expires_at` on `customer.subscription.created|updated|deleted` using Stripe `current_period_end`; cancels set to `now()`.
- Admin `/admin/partners` contains a Subscriptions panel (subscribe and open portal by email).

### Admin partners
- Partners list supports client-side search on the current page (by name/email)
- Manual pin/unpin panel: upserts partner by email+plan and pins/unpins provided slugs
 - Server-side search (ilike) with pagination in admin list

### Admin analytics
- Export CSV/JSON for selected period (Top slugs, Top sources, CTR table)
- Range presets: 7/30/90 days or Custom (date range)
- CTR per slug = clicks / impressions for the selected period
- Source summary groups by `utm_source`
- Per-slug mini sparklines (daily) for quick trend view

Impressions
- Frontend records impressions to `public.impressions` via `/api/track/impression` on first render of visible offers.
- Stored fields: `slug`, `ts`, `ip_hash`, `user_agent`, `referer`, `device`, `lang` (RLS allows authenticated read only).

## Sprint 3: SaaS Packaging & Metrics
- New public route `/pricing` with BASIC/FEATURED/TOP (Monthly/Yearly) and coupon support (Stripe Checkout via create-subscription)
- Partner Portal `/partner` (authenticated): shows pinned slugs and current plan/expires; "Billing" opens Stripe Customer Portal
- Impressions upgraded: IntersectionObserver (only visible items), dedup within 1h by (ip_hash+UA+slug), basic bot filter
- Admin Metrics `/admin/metrics`: MRR, ARR, churn, ARPA, CTR (top slugs) with CSV/JSON export

Env additions (frontend, optional for metrics):
- `NEXT_PUBLIC_PLAN_BASIC_MRR`, `NEXT_PUBLIC_PLAN_FEATURED_MRR`, `NEXT_PUBLIC_PLAN_TOP_MRR` - per-plan MRR values to compute MRR/ARR/ARPA in the dashboard

Acceptance
- TypeScript passes (`pnpm typecheck`), tests pass (`pnpm test`)
- New routes documented; Checkout and Portal work if Stripe env configured

### Webhooks page
- `/admin/webhooks` shows `public.webhook_logs_app` (latest first) while keeping the legacy `webhook_logs` view untouched for existing consumers.
- Filter by `event_type`, `log_status`, pagination (50/page), and a button "Purge >30d" (RPC `purge_webhook_logs(cutoff_ts timestamptz)`).
- Webhook payloads stored masked (emails masked, secrets removed).

### Health endpoint
- `/api/health` returns `{ ok, time, supabase: { ok }, duration_ms }`
- Pings Supabase (light select) when server env is present

## Supabase policies summary
- `public.settings`: RLS on; anon select; authenticated all (upsert)
- `public.clicks`: RLS on; authenticated select; inserts via service role only
- `public.impressions`: RLS on; authenticated select; inserts via service role only

## Cron tasks
- Schedule `/api/admin/maintenance/cleanup-clicks` (POST with `x-admin-token`) or call the `cleanup_clicks_before` RPC directly to purge old click data

## Orders archive
- Edge function `archive-orders` moves orders older than 120 days into `public.orders_archive` and writes a JSON snapshot to Supabase Storage (`ORDERS_ARCHIVE_BUCKET`, defaults to `orders-archive`). Every export is recorded in `public.orders_archive_export` with the storage URL and run id.
- Weekly cron job (`archive_orders_weekly`) triggers the edge function every Monday at 03:00 UTC with payload `{ olderThanDays: 120, batchSize: 200 }`. Before applying the migration set vault secrets:
  - `archive_orders_function_url` → `https://<project-ref>.functions.supabase.co/archive-orders`
  - `archive_orders_service_role` → service role key with permission to call the function
    ```bash
    supabase secrets set --env prod \
      archive_orders_function_url="https://YOUR-REF.functions.supabase.co/archive-orders" \
      archive_orders_service_role="YOUR_SERVICE_ROLE_KEY"
    ```
- Rollback instructions (by run id):
  1. Query `select * from public.orders_archive_export order by created_at desc limit 5;` to identify the `run_id` and storage path.
  2. Download the JSON snapshot (`storage://{bucket}/{run_id}/orders.json`) and verify the payload.
  3. Restore orders: run a transaction that inserts the base row and nested collections. Example:

     ```sql
     begin;

     with archived as (
       select * from public.orders_archive where archive_run_id = '00000000-0000-0000-0000-000000000000'
     )
     insert into public.orders (
       id, user_id, status, payment_status, subtotal, discount_total, shipping_total,
       grand_total, currency, created_at, paid_at, cancelled_at, checkout_metadata,
       contact_email, metadata_b, amount_cents, payment_intent_id
     )
     select
       id, user_id, status, payment_status, subtotal, discount_total, shipping_total,
       grand_total, currency, created_at, paid_at, cancelled_at, checkout_metadata,
       contact_email, metadata_b, amount_cents, payment_intent_id
     from archived
     on conflict (id) do update set
       status = excluded.status,
       payment_status = excluded.payment_status,
       grand_total = excluded.grand_total,
       amount_cents = excluded.amount_cents;

     with archived as (
       select id, archived_payload from public.orders_archive where archive_run_id = '00000000-0000-0000-0000-000000000000'
     ),
     items as (
       select
         archived.id as order_id,
         jsonb_to_recordset(archived.archived_payload -> 'items') as item(
           id uuid,
           product_id uuid,
           variant_id uuid,
           title text,
           qty int,
           unit_price numeric,
           total numeric,
           meta jsonb
         )
       from archived
     )
     insert into public.order_items (id, order_id, product_id, variant_id, title, qty, unit_price, total, meta)
     select item.id, order_id, item.product_id, item.variant_id, coalesce(item.title, ''), coalesce(item.qty, 0),
       coalesce(item.unit_price, 0), coalesce(item.total, 0), item.meta
     from items as item
     on conflict (id) do nothing;

     -- Repeat jsonb_to_recordset pattern for payments and refunds if needed

     commit;
     ```

  4. Call `resetOrdersCache()` from the SDK (or redeploy API) so cached lists reflect the restored orders.
- Keep the archive function service key scoped to this task and rotate periodically.

## Scripts
- `pnpm --filter web-next dev`: local dev
- `pnpm --filter web-next build`: production build

## License
MIT. Brand assets are placeholders - replace with your own.
