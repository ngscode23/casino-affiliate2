# Disabled migrations

`202509211320_fix_types_product_events.sql` was moved here to prevent Supabase CLI from executing a legacy hotfix that broke local dev (nested `DO $$ ...` with embedded `create` statements). Move it back to `supabase/migrations/` if you need to replay the original migration on a fresh database.***
