
-- noop: aligns with remote ----------------
supabase migration list --db-url $env:DB_URL_LOCAL
# для каждой local-only:
supabase migration repair --status reverted <LOCAL_ONLY_VERSION> --db-url $env:DB_URL_LOCAL

