# Maintenance Endpoints and Scheduling

This project exposes a few admin endpoints for routine maintenance. They are protected with `x-admin-token` header. Set `ADMIN_TOKEN` in your deployment environment.

## Endpoints

- `POST /api/admin/maintenance/cleanup-clicks`
  - Purges old click data via `cleanup_clicks_before(ts)` RPC. The retention window is controlled by env `CLICKS_RETENTION_DAYS` (default 90 days).

- `POST /api/admin/maintenance/cleanup-recent-views`
  - Calls `cleanup_recent_views()` RPC to remove stale `recent_views` rows.

- `POST /api/admin/analytics/refresh`
  - Triggers analytics materialized views refresh. Tries `refresh_analytics_mviews()` and falls back to `refresh_analytics_mvs()`.

All endpoints require header: `x-admin-token: <ADMIN_TOKEN>`.

## GitHub Actions Scheduler

If you deploy publicly reachable URLs, you can enable the preconfigured workflow `.github/workflows/ops-maintenance.yml`.

Configure repository secrets:

- `BASE_URL` — your deployed base URL, e.g. `https://example.com`.
- `ADMIN_TOKEN` — the same token as in your app environment.

Default schedule (UTC):

- 03:00 — cleanup clicks
- 03:30 — cleanup recent views
- 04:00 — refresh analytics MVs

Run manually via “Run workflow” for ad‑hoc maintenance.

