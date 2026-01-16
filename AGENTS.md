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

Catalog vs SKU (do not mix)
- Catalog models live under /admin/catalog and map to catalog brands/products.
- Storefront SKUs live under /admin/shop/products and map to ecom_products.
- Use new SKU APIs: /api/admin/shop/products, /upload-url, /images.
- Legacy SKU APIs are disabled (do not use /api/admin-products or /api/admin-get-upload-url).
- Supplier mapping is done via supplier_skus (supplier_id + sku_id + supplier_sku).
- Offers/inventory come from supplier_offers and supplier_inventory_levels.
- Reference doc: docs/sku-catalog-map.md

SKU photos: stable workflow
- Create Brand + Model in /admin/catalog.
- Create SKU in /admin/shop/products/new.
- Upload images (jpg/png/webp/gif only; avoid AVIF).
- Click Save after upload so ecom_products.images is persisted and catalog_products.thumbnail_url is synced.
- Storefront reads catalog_products_v.thumbnail_url; if missing, check ecom_products.images.
- If images still do not render, verify NEXT_PUBLIC_SUPABASE_URL in runtime env (Next Image allowlist).

New session prompt (use verbatim)
```
Read AGENTS.md and docs/sku-catalog-map.md.
Do not use legacy SKU APIs (/api/admin-products, /api/admin-get-upload-url).
SKU = ecom_products; storefront reads catalog_products_v.thumbnail_url.
After image upload, always Save SKU to persist images.
If photos missing: check catalog_products.thumbnail_url and ecom_products.images.
Use MCP Supabase for DB checks; do not inspect SQL in repo.
```

Note
- The above "Skip" items are soft guidance to reduce noise. If editing or inspecting them is necessary to complete the migration correctly, proceed and explain the rationale in the summary.
