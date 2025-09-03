# StarterSite (Vite + Netlify + Supabase)

Production-ready affiliate starter: i18n, SEO, server-side redirects with tracking, Supabase RLS, admin (offers + analytics), and onboarding.

## Requirements
- Node 20+
- pnpm (or npm/yarn)
- Supabase project (URL + anon + service role keys)
- Netlify account (for functions + scheduled tasks)

## Quick start
1. Copy `.env.example` to `.env` and fill at least:
   - SITE_NAME, SITE_URL, SITE_ORIGIN, BRAND_LOGO
   - VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (for Netlify functions)
2. Apply Supabase SQL (in Studio → SQL):
   - `supabase/settings.sql`
   - `supabase/clicks.sql` (если ещё не применён)
   - `supabase/clicks_ip_hash.sql`
   - `supabase/clicks_rls.sql`
   - `supabase/impressions.sql` (for CTR analytics)
3. Install deps and run:
   - `pnpm i`
   - `pnpm dev`
4. Open `/admin/login` → login, then `/admin/setup` and fill branding (site name, URL, logo, GA ID).
5. Add a couple offers in `/admin/offers`.
6. Test redirect `/go/:slug` — click is logged into `public.clicks` (UTM, referrer, UA, IP hash).

## Build & Deploy (Netlify)
- Set environment variables:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `CLICKS_RETENTION_DAYS` (optional, default 90)
  - `GA_ID` (optional), `SENTRY_DSN` (optional)
- Build command: `pnpm build`
- Publish directory: `dist`

## Verify Stripe locally
- Required env (Netlify Dev or shell):
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Price IDs for your plans (monthly/yearly) used by `create-subscription`
- Start Netlify Dev: `npm run dev:netlify`
- In another shell, start Stripe webhook forwarder:
  - `stripe listen --forward-to http://localhost:8888/.netlify/functions/stripe-webhook`
- Fire test events:
  - `stripe trigger checkout.session.completed`
  - `stripe trigger customer.subscription.updated`
  - `stripe trigger customer.subscription.deleted`
- Expected effects:
  - `public.partners.expires_at` is updated from subscription `current_period_end`
  - Pinned slugs are inserted/updated in `public.partner_offers`
  - `public.webhook_logs` contains masked payloads (no raw PII), one row per event id (idempotent)
- Admin UI checks:
  - `/admin/partners` shows pins and updated expiration
  - `/admin/webhooks` lists latest webhook events

## Features
- Server redirect `/go/:slug` with UTM/Ref/UA/IP hash logging (RLS enabled)
- Analytics `/admin/analytics`: clicks by day, top slugs, top sources, UTM report, CSV export
- SEO: canonical + hreflang (en/ru), og:locale, JSON‑LD (Organization sitewide, Product/Offer + Breadcrumb + FAQ on offers)
- i18n RU/EN with URL param `?lang=` and toggle in header
- Onboarding `/admin/setup` to configure branding + GA without modifying code

### Cookie consent (privacy-first)
- Consent is stored in localStorage under key `cookie-consent-v1`
- GA and Sentry initialize only after user grants analytics consent
- Component `src/components/layout/CookieBar.tsx` shows banner and emits `consent:changed`
- GA loader: `src/components/AnalyticsGateGA.tsx` (defers `gtag.js` until consent)
- Sentry gating: `src/lib/sentry.ts` initialized from `src/main.tsx`
- Toggle from footer: "Cookie settings" link opens the banner to change decision

### Analytics flags
- `VITE_GA_ID` or `VITE_GA_MEASUREMENT_ID` (alias)
- `VITE_SENTRY_DSN` (optional). Sampling is limited and only runs after consent
- `FEATURE_POSTHOG` (default false): enables PostHog when consent is granted and key present

### Paid placements (Stripe)
- Env (Netlify): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_FEATURED`, `STRIPE_PRICE_TOP`
- Create Prices in Stripe (Products → Prices) and copy `price_...` IDs to env
- Create Webhook endpoint: `https://<your-site>/.netlify/functions/stripe-webhook` and paste Signing secret to `STRIPE_WEBHOOK_SECRET`
- Scheduled Function `expire-partners` runs daily at 02:00 UTC to unpin expired offers

E2E test
- Open `/admin/partners` → Create Checkout (choose plan, duration, slugs)
- Complete Stripe test payment → webhook upserts `partners` and `partner_offers` (pinned=true), sets `expires_at`
- Pinned offers appear on top of `/offers`
- After expiration, pins are removed by `expire-partners`

### Subscriptions + Customer Portal
- Env (add to `.env` / Netlify):
  - `STRIPE_PRICE_BASIC_MONTHLY`, `STRIPE_PRICE_FEATURED_MONTHLY`, `STRIPE_PRICE_TOP_MONTHLY`
  - `STRIPE_PRICE_BASIC_YEARLY`, `STRIPE_PRICE_FEATURED_YEARLY`, `STRIPE_PRICE_TOP_YEARLY`
  - `STRIPE_CUSTOMER_PORTAL_URL` (optional override for portal return URL)
- Functions:
  - `/.netlify/functions/create-subscription` – POST `{ email, plan, interval, coupon? }` – returns `{ url }` (Checkout Session)
  - `/.netlify/functions/customer-portal` – POST `{ email }` – returns `{ url }` (Billing Portal)
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
- Frontend records impressions to `public.impressions` via `/.netlify/functions/track-impression` on first render of visible offers.
- Stored fields: `slug`, `ts`, `ip_hash`, `user_agent`, `referer`, `device`, `lang` (RLS allows authenticated read only).

## Sprint 3: SaaS Packaging & Metrics
- New public route `/pricing` with BASIC/FEATURED/TOP (Monthly/Yearly) and coupon support (Stripe Checkout via create-subscription)
- Partner Portal `/partner` (authenticated): shows pinned slugs and current plan/expires; “Billing” opens Stripe Customer Portal
- Impressions upgraded: IntersectionObserver (only visible items), dedup within 1h by (ip_hash+UA+slug), basic bot filter
- Admin Metrics `/admin/metrics`: MRR, ARR, churn, ARPA, CTR (top slugs) with CSV/JSON export

Env additions (frontend, optional for metrics):
- `VITE_PLAN_BASIC_MRR`, `VITE_PLAN_FEATURED_MRR`, `VITE_PLAN_TOP_MRR` – per-plan MRR values to compute MRR/ARR/ARPA in the dashboard

Acceptance
- TypeScript passes (`npm run typecheck`), tests pass (`npm test`)
- New routes documented; Checkout and Portal work if Stripe env configured

### Webhooks page
- `/admin/webhooks` shows `public.webhook_logs` (latest first)
- Filter by `type`, pagination (50/page), and a button “Purge >30d” (RPC `purge_webhook_logs(cutoff_ts timestamptz)`).
- Webhook payloads stored masked (emails masked, secrets removed).

### Health function
- Netlify Function `/.netlify/functions/health` returns JSON: `{ ok, time, commit, supabase: { ok }, duration_ms }`
- Pings Supabase (light select) when server env is present

## Supabase policies summary
- `public.settings`: RLS on; anon select; authenticated all (upsert)
- `public.clicks`: RLS on; authenticated select; inserts via service role only
- `public.impressions`: RLS on; authenticated select; inserts via service role only

## Cron tasks
- `cleanup-clicks` (Netlify Scheduled Function): removes clicks older than `CLICKS_RETENTION_DAYS` using RPC `cleanup_clicks_before`

## Scripts
- `pnpm dev`: local dev
- `pnpm dev:netlify`: local dev with Netlify Functions proxy (recommended)
- `pnpm build`: production build
- `pnpm sitemap`: generate `public/sitemap.xml` (with alternates)

## License
MIT. Brand assets are placeholders — replace with your own.
