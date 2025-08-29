// scripts/generate-sitemap.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const SITE_ORIGIN = process.env.SITE_ORIGIN || process.env.VITE_SITE_ORIGIN || "http://localhost:5173";

const routes = [
  "/", "/offers", "/compare", "/favorites",
  "/contact",
  "/legal/privacy", "/legal/terms", "/legal/cookies",
  "/legal/responsible", "/legal/affiliate-disclosure",
];

let offerSlugs = [];
try {
  // Attempt to read normalized offers from TS source by basic parsing (no TS runtime required)
  const offersTsPath = path.join(ROOT, "src/lib/offers.ts");
  if (fs.existsSync(offersTsPath)) {
    const src = fs.readFileSync(offersTsPath, "utf8");
    // naive extract of slugs from static data when available
    const matches = [...src.matchAll(/slug:\s*"([^"]+)"/g)];
    offerSlugs = matches.map(m => m[1]);
  }
} catch {}

const origin = SITE_ORIGIN.replace(/\/$/, "");
const urls = [
  ...routes.map(u => `${origin}${u}`),
  ...offerSlugs.map(s => `${origin}/offers/${encodeURIComponent(s)}`),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n`+
  `<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">\n`+
  urls.map(u => `  <url><loc>${u}</loc><changefreq>daily</changefreq><priority>0.7</priority></url>`).join("\n")+
  `\n</urlset>\n`;

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), xml, "utf8");
console.log(`[sitemap] generated ${urls.length} urls -> public/sitemap.xml`);

