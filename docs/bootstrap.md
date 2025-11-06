# Fast Bootstrap Script

To bring the Next.js workspace online quickly, run the bundled installer:

```bash
pnpm bootstrap
```

The script checks Node.js and pnpm versions, installs dependencies via the workspace lockfile, provisions `.env` templates (`.env`, `apps/web-next/.env.local`), and performs a first `pnpm --filter web-next build` so the app is ready to launch.

Useful switches:

- `--skip-install` – leave existing `node_modules` untouched.
- `--skip-env` – keep current env files.
- `--skip-build` – avoid the initial production build.
- `--prefer-offline` – reuse the pnpm store when already populated.

After bootstrap, start local development with:

```bash
pnpm dev:web-next
```
