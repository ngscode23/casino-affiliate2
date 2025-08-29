// scripts/generate-sitemap.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "public"); // кладём рядом с index.html
const SITE_ORIGIN = process.env.SITE_ORIGIN || process.env.VITE_SITE_ORIGIN || "http://localhost:5173";

// базовые роуты сайта (добавь/убери по нужде)
const routes = [
  "/", "/offers", "/compare", "/favorites",
  "/contact",
  "/legal/privacy", "/legal/terms", "/legal/cookies",
  "/legal/responsible", "/legal/affiliate-disclosure"
];

// если есть статический справочник офферов — добавим их страницы
let offerSlugs = [];
try {
  const offers = await import(path.join(ROOT, "src/lib/offers.ts"))
    .then(m => m.offersNormalized || [])
    .catch(() => []);
  offerSlugs = offers.map(o => o.slug).filter(Boolean);
} catch {}

const urls = [
  ...routes.map(u => `${SITE_ORIGIN.replace(/\/$/, "")}${u}`),
  ...offerSlugs.map(s => `${SITE_ORIGIN.replace(/\/$/, "")}/offers/${encodeURIComponent(s)}`)
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><changefreq>daily</changefreq><priority>0.7</priority></url>`).join("\n")}
</urlset>
`;

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, "sitemap.xml"), xml, "utf8");
console.log(`[sitemap] generated ${urls.length} urls → public/sitemap.xml`);