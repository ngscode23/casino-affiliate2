Agent working rules for this repo

Scope: entire repository

Purpose
- Keep the assistant fast and focused during the Next.js migration.
- Avoid scanning/editing heavy, generated, or sensitive files unless explicitly asked.

Skip (prefer to ignore; may override if needed)
- Generated/build: `.next/`, `.turbo/`, `.vercel/`, `dist/`, `build/`, `out/`, `coverage/`, `.vite/`
- Dependencies and caches: `node_modules/`, `.pnpm-store/`, `.yarn/`, `.cache/`
- Test artifacts: `playwright-report/`, `test-results/`
- Logs and backups: `logs/`, `backups/`, `backup_before_*`, `*.log`, `trace.txt`, `netlify-debug*`
- Large/binary: `openai.chatgpt-*.vsix`, `*.zip` (media in `public/**` allowed if migration requires)

Secrets and config
- Never print or copy contents of `.env*` files. If environment values are needed, ask first and mask secrets.
- Do not commit changes to `.env*` or secrets.

Search and navigation
- Prefer targeted `rg` searches within `apps/**` and `packages/**`.
- Use narrow globs and avoid repository‑wide scans when not necessary.

Migration focus
- Primary code paths: `apps/web-next/**` and related packages in `packages/**`.
- Allowed to modify `package.json`, workspace manifests, and lockfiles (e.g., `pnpm-lock.yaml`) when adding/updating Next.js dependencies.
- Allowed to create/move/delete files needed for migration (routes, pages, API handlers, config, scripts).
- Allowed to update CI/CD and hosting configs (e.g., `netlify.toml`, deployment scripts) when relevant to Next.js.
- Allowed to apply/update DB/Supabase migrations under `apps/**/supabase/migrations/**`.

Style and changes
- Make minimal, surgical changes consistent with the existing codebase.
- Update documentation only where it relates to edited code.

Note
- The above "Skip" items are soft guidance to reduce noise. If editing or inspecting them is necessary to complete the migration correctly, proceed and explain the rationale in the summary.
