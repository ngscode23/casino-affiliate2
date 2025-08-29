// // scripts/reorg.js
// // Run: node scripts/reorg.js
// // Purpose: reorganize src/* files into a cleaner structure with safe shims.

// const fs = require("fs");
// const path = require("path");

// const ROOT = process.cwd();
// const SRC = path.join(ROOT, "src");

// function ensureDir(p) {
//   fs.mkdirSync(p, { recursive: true });
// }

// function exists(p) {
//   try { fs.accessSync(p); return true; } catch { return false; }
// }

// function moveWithShim(fromRel, toRel, opts = {}) {
//   const from = path.join(SRC, fromRel);
//   const to = path.join(SRC, toRel);


  
//   if (!exists(from)) {
//     console.log(`- skip (missing): ${fromRel}`);
//     return;
//   }

//   ensureDir(path.dirname(to));
//   fs.renameSync(from, to);
//   console.log(`✓ moved: ${fromRel}  ->  ${toRel}`);

//   // добавить shim на старый путь, чтобы старые импорты не падали
//   if (opts.makeShim !== false) {
//     const shim = `export { default } from "${opts.shimImport || relToAlias(to)}";\n` +
//                  (opts.named ? `export * from "${opts.shimImport || relToAlias(to)}";\n` : "");
//     ensureDir(path.dirname(from));
//     fs.writeFileSync(from, shim);
//     console.log(`  ↳ shim written at old path: ${fromRel}`);
//   }
// }

// function relToAlias(absPath) {
//   // превратим абсолютный путь внутри src в '@/...' (при наличии alias в vite.config.ts)
//   const rel = path.relative(SRC, absPath).replace(/\\/g, "/");
//   return `@/${rel.replace(/^\/?/, "")}`.replace(/\.tsx?$/,"").replace(/\.jsx?$/,"");
// }

// function writeFile(rel, content) {
//   const p = path.join(SRC, rel);
//   ensureDir(path.dirname(p));
//   fs.writeFileSync(p, content, "utf8");
//   console.log(`✓ wrote: ${rel}`);
// }

// function backup(rel) {
//   const p = path.join(SRC, rel);
//   if (!exists(p)) return;
//   const b = path.join(SRC, `${rel}.bak`);
//   ensureDir(path.dirname(b));
//   fs.copyFileSync(p, b);
//   console.log(`  ↺ backup: ${rel} -> ${rel}.bak`);
// }

// // ---- 1) целевые каталоги (на всякий случай) ----
// [
//   "components/layout",
//   "components/common",
//   "components/compare",
//   "components/offers",
//   "components/auth",
//   "components/faq",
//   "components/seo",
//   "components/misc",
//   "features/offers/api",
//   "features/offers/components",
//   "pages/Home",
//   "pages/Compare",
//   "pages/Offers",
//   "pages/Offer",
//   "pages/Favorites",
//   "pages/Legal",
//   "pages/Auth",
//   "pages/Admin/offers",
//   "ctx",
//   "lib",
//   "styles",
//   "assets/images",
//   "assets/icons",
// ].forEach(dir => ensureDir(path.join(SRC, dir)));

// // ---- 2) перенос файлов с шима́ми ----
// // Меняй / добавляй пары по своему проекту.
// const MOVES = [
//   // SEO
//   ["components/OrgJsonLd.tsx", "components/seo/OrgJsonLd.tsx"],
//   ["components/Seo.tsx",       "components/seo/Seo.tsx"],

//   // Layout
//   ["components/CookieBar.tsx",        "components/layout/CookieBar.tsx"],
//   ["components/layout/CookieBar.tsx", "components/layout/CookieBar.tsx"], // на случай если уже ок — будет skip

//   // Misc
//   ["components/FavControl.tsx",      "components/misc/FavControl.tsx"],
//   ["components/AffiliateLink.tsx",   "components/misc/AffiliateLink.tsx"],
//   ["components/PageViewTracker.tsx", "components/misc/PageViewTracker.tsx"],

//   // Offers feature (если где-то лежит иначе — поправь)
//   ["features/offers/components/OfferFiltersFeature.tsx", "features/offers/components/OfferFiltersFeature.tsx"],
//   ["features/offers/api/useOffers.ts",                   "features/offers/api/useOffers.ts"],

//   // Common (на всякий случай)
//   ["components/common/section.tsx", "components/common/Section.tsx"],
//   ["components/common/card.tsx",    "components/common/Card.tsx"],
//   ["components/common/button.tsx",  "components/common/Button.tsx"],
//   ["components/common/rating.tsx",  "components/common/Rating.tsx"],
//   ["components/common/skeleton.tsx","components/common/Skeleton.tsx"],
//   ["components/common/ErrorBoundary.tsx","components/common/ErrorBoundary.tsx"],

//   // FAQ
//   ["components/faq/FAQ.tsx", "components/faq/FAQ.tsx"],

//   // Auth UI
//   ["components/auth/UserBadge.tsx",          "components/auth/UserBadge.tsx"],
//   ["components/auth/VerifyEmailBanner.tsx",  "components/auth/VerifyEmailBanner.tsx"],

//   // Compare
//   ["components/compare/CompareTable.tsx", "components/compare/CompareTable.tsx"],
//   ["components/compare/CompareRow.tsx",   "components/compare/CompareRow.tsx"],
//   ["components/compare/CompareFilters.tsx","components/compare/CompareFilters.tsx"],

//   // Offers UI
//   ["components/offers/MobileOfferCard.tsx","components/offers/MobileOfferCard.tsx"],
//   ["components/offers/OfferCard.tsx",      "components/offers/OfferCard.tsx"],
// ];

// for (const [from, to] of MOVES) moveWithShim(from, to);

// // ---- 3) recent.ts — заменить на исправленную версию (с бэкапом) ----
// const recentFixed = `export const RECENT_KEY = "recent:offers:v1";
// export const RECENT_MAX = 12;

// function readRecent(): string[] {
//   try {
//     const raw = localStorage.getItem(RECENT_KEY);
//     if (!raw) return [];
//     const arr = JSON.parse(raw);
//     if (!Array.isArray(arr)) return [];
//     return arr.filter((x) => typeof x === "string");
//   } catch (e) {
//     if (import.meta.env.DEV) console.warn("[recent] read failed:", e);
//     return [];
//   }
// }

// function writeRecent(list: string[]) {
//   try {
//     const next = list.slice(0, RECENT_MAX);
//     localStorage.setItem(RECENT_KEY, JSON.stringify(next));
//   } catch (e) {
//     if (import.meta.env.DEV) console.warn("[recent] persist failed:", e);
//   }
// }

// export function getRecent(): string[] {
//   if (typeof window === "undefined") return [];
//   return readRecent();
// }

// export function pushRecent(slug?: string | null) {
//   if (typeof window === "undefined") return;
//   const key = String(slug ?? "").trim();
//   if (!key) return;
//   const list = readRecent().filter((s) => s !== key);
//   list.unshift(key);
//   writeRecent(list);
// }

// export function clearRecent() {
//   if (typeof window === "undefined") return;
//   try {
//     localStorage.removeItem(RECENT_KEY);
//   } catch (e) {
//     if (import.meta.env.DEV) console.warn("[recent] clear failed:", e);
//   }
// }
// `;

// if (exists(path.join(SRC, "lib/recent.ts"))) {
//   backup("lib/recent.ts");
//   writeFile("lib/recent.ts", recentFixed);
// } else {
//   writeFile("lib/recent.ts", recentFixed);
// }

// // ---- 4) напоминание
// console.log("\nDone.");
// console.log("Next steps:");
// console.log("  • Проверить сборку: npm run typecheck && npm run lint && npm run build");
// console.log("  • Проект продолжит работать через shim-файлы на старых путях.");
// console.log("  • Постепенно обновляй импорты на новые пути и удаляй shims.");

// scripts/fix-imports.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, "../src");

const TS_EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);

/** Рекурсивный сбор всех файлов с нужными расширениями */
function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(p));
    } else if (TS_EXTS.has(path.extname(entry.name))) {
      out.push(p);
    }
  }
  return out;
}

/** Преобразование содержимого файла по нашим правилам */
function transform(code) {
  let changed = false;
  let next = code;

  // 1) { useOffers } -> default import
  //   import { useOffers } from "…/useOffers";
  //   -> import useOffers from "…/useOffers";
  next = next.replace(
    /import\s*\{\s*useOffers\s*\}\s*from\s*["']([^"']*\/features\/offers\/api\/useOffers)["'];?/g,
    (m, mod) => {
      changed = true;
      return `import useOffers from "${mod}";`;
    }
  );

  // 2) OfferFiltersFeature, { type OffersFilterState } -> только default OfferFiltersFeature
  //   import OfferFiltersFeature, { type OffersFilterState } from "…/OfferFiltersFeature";
  //   -> import OfferFiltersFeature from "…/OfferFiltersFeature";
  next = next.replace(
    /import\s+OfferFiltersFeature\s*,\s*\{\s*type\s+OffersFilterState\s*\}\s+from\s*["']([^"']*OfferFiltersFeature)["'];?/g,
    (m, mod) => {
      changed = true;
      return `import OfferFiltersFeature from "${mod}";`;
    }
  );

  // 2b) Если где-то импортировали ТОЛЬКО OffersFilterState из того же модуля — удалим строку импорта целиком,
  // оставим комментарий, чтобы потом (при необходимости) руками вернуть из корректного места.
  next = next.replace(
    /import\s*\{\s*type\s+OffersFilterState\s*\}\s*from\s*["']([^"']*OfferFiltersFeature)["'];?\n?/g,
    (m, mod) => {
      changed = true;
      return `// TODO: OffersFilterState больше не экспортируется из ${mod}\n`;
    }
  );

  return { changed, next };
}

/** Основной проход по файлам */
function run() {
  const files = listFiles(SRC_DIR);
  let changedCount = 0;

  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const { changed, next } = transform(src);
    if (changed) {
      // бэкап
      fs.writeFileSync(`${file}.bak`, src, "utf8");
      // запись
      fs.writeFileSync(file, next, "utf8");
      changedCount++;
      console.log(`✓ updated imports in: ${path.relative(process.cwd(), file)}`);
    }
  }

  if (changedCount === 0) {
    console.log("No files needed changes. All good!");
  } else {
    console.log(`Done. Files updated: ${changedCount}`);
    console.log("Backups saved as *.bak next to originals.");
  }
}

run();