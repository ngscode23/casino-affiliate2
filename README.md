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

### Admin partners
- Partners list supports client-side search on the current page (by name/email)
- Manual pin/unpin panel: upserts partner by email+plan and pins/unpins provided slugs
 - Server-side search (ilike) with pagination in admin list

### Admin analytics
- Export CSV for selected period
- Range presets: 7/30/90 days or Custom (date range)
- Source summary groups by `utm_source` for the selected period
- Per-slug mini sparklines (daily) for quick trend view

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

## Cron tasks
- `cleanup-clicks` (Netlify Scheduled Function): removes clicks older than `CLICKS_RETENTION_DAYS` using RPC `cleanup_clicks_before`

## Scripts
- `pnpm dev`: local dev
- `pnpm build`: production build
- `pnpm sitemap`: generate `public/sitemap.xml` (with alternates)

## License
MIT. Brand assets are placeholders — replace with your own.
