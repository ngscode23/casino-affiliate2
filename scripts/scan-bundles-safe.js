// scan-bundles-safe.js
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve as r } from "node:path";

const START = process.argv[2];
if (!START) { console.error("Usage: node scan-bundles-safe.js <url> [--save-bundles] [--depth=2] [--max-js=300] [--max-size-mb=5]"); process.exit(1); }

const OPT = Object.fromEntries(process.argv.slice(3).map(s=>{
  const m = s.match(/^--([^=]+)(=(.+))?$/); return m? [m[1], m[3] ?? true] : [s,true];
}));
const SAVE_BUNDLES = !!OPT["save-bundles"];
const DEPTH  = Number(OPT["depth"] ?? 2);
const MAX_JS = Number(OPT["max-js"] ?? 300);
const MAX_SIZE_MB = Number(OPT["max-size-mb"] ?? 5);

const UA = `ScanJS/1.1 (+security research; contact: you@example.com)`;
const START_URL = new URL(START);
const OUT_DIR = r(process.cwd(), "dump/js");
const REPORT_JSON = r(process.cwd(), "report.json");
const REPORT_TXT  = r(process.cwd(), "report.txt");

const IGNORE_HOSTS = new Set([
  "www.googletagmanager.com","www.google-analytics.com","region1.google-analytics.com",
  "connect.facebook.net","static.cloudflareinsights.com","js.stripe.com","cdn.jsdelivr.net",
  "www.gstatic.com","www.google.com","tagmanager.google.com","cdn.segment.com","static.hotjar.com",
  "cdn.sentry.io","browser.sentry-cdn.com"
]);

const KEYWORDS = [
  "client_id","app_id","projectId","measurementId","dsn","endpoint","baseUrl","graphql","rest/v1","supabase",
  "serviceRole","private","admin","root","bucket","s3","aws_access_key","aws_secret","mongo","postgres","dbPassword",
  "stripe","sk_live","pk_live","secret_key","algolia","mapbox","recaptcha","turnstile",
  "authorization","bearer","jwt","id_token","csrf","hmac","signature","webhook","x-signature","apikey","api_key",
  "secret","token","todo","fixme"
];

const PATTERNS = [
  { name:"JWT", rx:/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name:"AWS_ACCESS_KEY_ID", rx:/AKIA[0-9A-Z]{16}/g },
  { name:"GoogleAPIKey", rx:/AIza[0-9A-Za-z\-_]{35}/g },
  { name:"StripeSecret", rx:/sk_(live|test)_[0-9A-Za-z]{24,}/g },
  { name:"StripePublishable", rx:/pk_(live|test)_[0-9A-Za-z]{24,}/g },
  { name:"SentryDSN", rx:/https?:\/\/[a-z0-9]+@o[0-9]+\.ingest\.[a-z.]+\/[0-9]+/gi },
  { name:"SupabaseServiceRole", rx:/service[_-]?role/gi },
  { name:"AuthHeaders", rx:/authorization|bearer|id_token|access[_-]?token/gi },
];

// подписанные URL/временные ссылки — игнор
const SIGNED_PARAMS = ["X-Amz-Signature","X-Amz-Credential","X-Amz-Security-Token","X-Goog-Signature","Policy","Signature","Expires","token","signature"];

const sleep = (ms)=>new Promise(res=>setTimeout(res,ms));

async function safeFetch(url, init={}, attempt=0) {
  const res = await fetch(url, { redirect:"follow", headers:{ "User-Agent": UA, ...(init.headers||{}) }, ...init });
  if ([429,503].includes(res.status) && attempt < 5) {
    const backoff = 300 * Math.pow(2, attempt);
    await sleep(backoff);
    return safeFetch(url, init, attempt+1);
  }
  return res;
}

function sameHost(u){ return new URL(u).host === START_URL.host; }
function hasSignedParams(u){ const q = new URL(u).searchParams; return SIGNED_PARAMS.some(p=>q.has(p)); }

async function robotsAllow(url) {
  try {
    const base = `${START_URL.protocol}//${START_URL.host}`;
    const res = await safeFetch(`${base}/robots.txt`);
    if (!res.ok) return true;
    const txt = await res.text();
    // очень простая проверка: Disallow для пути
    const dis = txt.split(/\r?\n/).filter(l=>/^Disallow:/i.test(l)).map(l=>l.split(":")[1].trim());
    const p = new URL(url).pathname;
    return !dis.some(rule => rule && p.startsWith(rule));
  } catch { return true; }
}

function extractFromHTML(html, base) {
  const A = [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)].map(m=>m[1]);
  const S = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]);
  const J = [...html.matchAll(/["']([^"']+\.js)(\?[^"']*)?["']/gi)].map(m=>m[1]);
  const abs = (h)=>{ try{ return new URL(h, base).toString(); }catch{ return null; } };
  return {
    pages: A.map(abs).filter(Boolean),
    scripts: [...S, ...J].map(abs).filter(Boolean),
  };
}

function redactSample(s) {
  // минимальная защита PII/секретов в отчёте
  return s.replace(/[A-Za-z0-9_\-\.]{12,}/g, (m)=> m.length>20 ? m.slice(0,6)+"…"+m.slice(-4) : m);
}

function scanText(txt) {
  const hits = [];
  const kws = KEYWORDS.filter(k => txt.toLowerCase().includes(k.toLowerCase())).slice(0,30);
  if (kws.length) hits.push({ type:"keywords", values:kws });

  for (const {name,rx} of PATTERNS) {
    rx.lastIndex = 0;
    const m = txt.match(rx);
    if (m && m.length) {
      const uniq = [...new Set(m)].slice(0,5).map(redactSample);
      hits.push({ type:name, values:uniq });
    }
  }
  return hits;
}

async function headCheck(url) {
  const h = await safeFetch(url, { method:"HEAD" });
  if (!h.ok) return { ok:false, reason:`${h.status}` };
  const ct = h.headers.get("content-type") || "";
  if (!ct.includes("javascript")) return { ok:false, reason:`content-type=${ct}` };
  const len = Number(h.headers.get("content-length") || "0");
  if (len && len > MAX_SIZE_MB*1024*1024) return { ok:false, reason:`size=${(len/1048576).toFixed(1)}MB` };
  return { ok:true };
}

(async ()=>{
  console.log(`Start: ${START_URL.href}`);
  if (!existsSync(OUT_DIR) && SAVE_BUNDLES) await mkdir(OUT_DIR, { recursive:true });

  if (!(await robotsAllow(START_URL.href))) {
    console.error("robots.txt disallows start path. Aborting.");
    process.exit(2);
  }

  const queue = [{ url: START_URL.href, depth: 0 }];
  const seen = new Set();
  const jsSet = new Set();

  while (queue.length) {
    const { url, depth } = queue.shift();
    if (seen.has(url) || depth > DEPTH) continue;
    seen.add(url);

    try {
      const res = await safeFetch(url);
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("text/html")) continue;
      const html = await res.text();

      // уважаем meta robots
      const metaRobots = /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1] || "";
      if (/noindex|nofollow/i.test(metaRobots)) continue;

      const { pages, scripts } = extractFromHTML(html, url);
      for (const s of scripts) {
        const host = new URL(s).host;
        if (IGNORE_HOSTS.has(host)) continue;
        if (hasSignedParams(s)) continue;
        jsSet.add(s);
      }
      for (const p of pages) {
        if (sameHost(p)) queue.push({ url:p, depth:depth+1 });
      }
    } catch {}
    await sleep(500); // вежливый троттлинг
    if (jsSet.size >= MAX_JS) break;
  }

  const jsUrls = [...jsSet].slice(0, MAX_JS);
  console.log(`JS candidates: ${jsUrls.length}`);

  const report = [];
  for (const url of jsUrls) {
    try {
      const allow = await robotsAllow(url);
      if (!allow) { process.stdout.write("r"); continue; }

      const head = await headCheck(url);
      if (!head.ok) { process.stdout.write("-"); continue; }

      const res = await safeFetch(url);
      if (!res.ok) { process.stdout.write("x"); continue; }
      const txt = await res.text();
      const hits = scanText(txt);

      if (hits.length) {
        const item = { url, hits };
        if (SAVE_BUNDLES) {
          const name = url.split("/").pop()?.replace(/[?&#].*$/,"") || "bundle.js";
          const path = r(OUT_DIR, name);
          await writeFile(path, txt, "utf8");
          item.file = path;
        }
        report.push(item);
        process.stdout.write("✔");
      } else {
        process.stdout.write(".");
      }
    } catch { process.stdout.write("x"); }
    await sleep(400);
  }

  await writeFile(REPORT_JSON, JSON.stringify(report, null, 2), "utf8");
  const pretty = report.map(i => [
    `URL: ${i.url}`,
    ...(i.file ? [`FILE: ${i.file}`] : []),
    ...i.hits.map(h => `  - ${h.type}: ${h.values.join(" | ")}`)
  ].join("\n")).join("\n\n") || "No matches.";
  await writeFile(REPORT_TXT, pretty, "utf8");

  console.log(`\nDone.
  JSON: ${REPORT_JSON}
  TXT:  ${REPORT_TXT}
  Saved bundles: ${SAVE_BUNDLES ? "yes" : "no"}`);
})();