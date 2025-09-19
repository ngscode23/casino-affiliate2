// scripts/generate-sitemap.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const SITE_ORIGIN = process.env.SITE_ORIGIN || process.env.VITE_SITE_ORIGIN || "http://localhost:5173";

const routes = [
  "/",
  "/catalog", "/cart", "/wishlist", "/checkout",
  "/contact",
  "/legal/privacy", "/legal/terms", "/legal/cookies",
  "/legal/affiliate-disclosure",
];

// Offer-specific expansion disabled

const origin = SITE_ORIGIN.replace(/\/$/, "");
const urls = routes.map(u => `${origin}${u}`);

function entry(u){
  const join = u.includes('?') ? '&' : '?';
  const en = `${u}${join}lang=en`;
  const ru = `${u}${join}lang=ru`;
  // Use EN as loc, include alternates for both langs and x-default
  return [
    '  <url>',
    `    <loc>${en}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${en}" />`,
    `    <xhtml:link rel="alternate" hreflang="ru" href="${ru}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${u}" />`,
    '    <changefreq>daily</changefreq>',
    '    <priority>0.7</priority>',
    '  </url>'
  ].join('\n');
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n`+
  `<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`+
  urls.map(entry).join("\n")+
  `\n</urlset>\n`;

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), xml, "utf8");
console.log(`[sitemap] generated ${urls.length} urls -> public/sitemap.xml`);


