Supabase Migrations

- Migrations are organized under `supabase/migrations/` with timestamped filenames.
- Files were generated from the existing `.sql` specs in `supabase/` for easier CLI use.

Usage with Supabase CLI

- Validate locally:
  - `supabase start` (if using local dev)
  - `supabase migration up` to apply
  - `supabase db dump` to inspect

- Apply to remote project:
  - `supabase link --project-ref <your-ref>`
  - `supabase db push` (or `migration up`)

Notes

- Edit future changes as new timestamped files under `supabase/migrations/`.
- Keep RLS policies in the same migration as their tables when possible.

