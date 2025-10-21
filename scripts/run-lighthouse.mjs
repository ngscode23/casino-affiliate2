#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fg from "fast-glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const APP_DIR = path.resolve(ROOT, "apps", "web-next", "app");
const DEFAULT_CONFIG = path.resolve(__dirname, "lighthouse.routes.json");

function parseArgs(argv) {
  const args = {};
  const extras = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const [key, value] = token.includes("=") ? token.split(/=(.+)/) : [token, argv[i + 1]];
      const normalizedKey = key.replace(/^--/, "");
      if (!token.includes("=") && value && !value.startsWith("--")) {
        args[normalizedKey] = value;
        i += 1;
      } else if (token.includes("=")) {
        args[normalizedKey] = value;
      } else {
        args[normalizedKey] = true;
      }
    } else {
      extras.push(token);
    }
  }
  args._ = extras;
  return args;
}

function normalizePath(value) {
  if (!value) return "/";
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    const pathWithQuery = `${url.pathname}${url.search}` || "/";
    return decodeURIComponent(pathWithQuery);
  }
  if (value.startsWith("/")) return value;
  return `/${value}`;
}

function toAbsoluteUrl(baseUrl, route) {
  if (/^https?:\/\//i.test(route)) return route;
  const trimmed = route.startsWith("/") ? route : `/${route}`;
  return new URL(trimmed, baseUrl).toString();
}

function isDynamicSegment(segment) {
  return /\[|\]/.test(segment);
}

async function collectFilesystemRoutes() {
  const files = await fg(["**/page.@(ts|tsx|js|jsx|mdx)"], {
    cwd: APP_DIR,
    onlyFiles: true,
    followSymbolicLinks: false,
  });

  const staticRoutes = new Set();
  const dynamicRoutes = new Set();

  for (const file of files) {
    const relativeDir = path.dirname(file);
    if (relativeDir.startsWith("api")) continue;

    const parts = relativeDir === "." ? [] : relativeDir.split(path.sep).filter(Boolean);
    const cleanedParts = [];
    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith("(") && part.endsWith(")")) continue;
      if (part.startsWith("@")) continue;
      cleanedParts.push(part);
    }

    const route = `/${cleanedParts.join("/")}`.replace(/\/+/g, "/");
    if (!route || route === "") {
      staticRoutes.add("/");
      continue;
    }
    if (cleanedParts.some(isDynamicSegment)) {
      dynamicRoutes.add(route);
    } else {
      staticRoutes.add(route);
    }
  }

  return {
    static: Array.from(staticRoutes).sort(),
    dynamic: Array.from(dynamicRoutes).sort(),
  };
}

async function fetchSitemapRoutes(baseUrl, sitemapPath) {
  try {
    const url = new URL(sitemapPath || "/sitemap.xml", baseUrl);
    const response = await fetch(url, {
      headers: {
        Accept: "application/xml,text/xml;q=0.9,*/*;q=0.1",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    const matches = [...text.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
    return matches.filter(Boolean).map((href) => {
      try {
        return normalizePath(href);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (err) {
    console.warn(`[lighthouse] Failed to fetch sitemap: ${err?.message || err}. Falling back to filesystem scan.`);
    return [];
  }
}

async function loadConfig(configPath) {
  try {
    const resolved = path.resolve(configPath);
    const data = await fs.readFile(resolved, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    console.warn(`[lighthouse] Failed to read config ${configPath}: ${err?.message || err}`);
    return {};
  }
}

function isExcluded(pathname, patterns) {
  if (!patterns || !patterns.length) return false;
  for (const pattern of patterns) {
    if (!pattern) continue;
    const normalizedPattern = normalizePath(pattern);
    if (normalizedPattern.endsWith("*")) {
      const prefix = normalizedPattern.slice(0, -1);
      if (pathname.startsWith(prefix)) return true;
    } else if (pathname === normalizedPattern) {
      return true;
    }
  }
  return false;
}

function dedupe(list) {
  return Array.from(new Set(list));
}

function formatReportName(url, preset, usedNames) {
  const { pathname, searchParams } = new URL(url);
  const basePath = pathname === "/" ? "home" : pathname.replace(/^\//, "").replace(/\/+/g, "-");
  const queryPart = searchParams && [...searchParams.keys()].length ? `_${searchParams.toString().replace(/[^a-z0-9]+/gi, "-")}` : "";
  let candidate = `${basePath || "home"}${queryPart}_${preset}`.replace(/[^a-z0-9-_]+/gi, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  if (!candidate) candidate = `report_${preset}`;
  let uniqueName = candidate;
  let counter = 2;
  while (usedNames.has(uniqueName)) {
    uniqueName = `${candidate}-${counter}`;
    counter += 1;
  }
  usedNames.add(uniqueName);
  return `${uniqueName}.html`;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function runLighthouseBatch(urls, preset, options) {
  const { default: lighthouse } = await import("lighthouse");
  const chromeLauncher = await import("chrome-launcher");
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });

  const configModule =
    preset === "desktop"
      ? await import("lighthouse/core/config/lr-desktop-config.js")
      : await import("lighthouse/core/config/lr-mobile-config.js");
  const config = configModule.default || configModule;

  const summary = [];
  const failures = [];
  const usedNames = new Set();

  try {
    for (const [index, url] of urls.entries()) {
      const label = `[${options.label}] ${index + 1}/${urls.length} ${url}`;
      console.log(`${label} -> running ${preset} audit...`);
      try {
        const result = await lighthouse(
          url,
          {
            port: chrome.port,
            output: "html",
            logLevel: options.verbose ? "info" : "error",
            onlyCategories: options.categories,
          },
          config,
        );
        const reportHtml = Array.isArray(result.report) ? result.report[0] : result.report;
        const fileName = formatReportName(url, preset, usedNames);
        const targetPath = path.join(options.outDir, fileName);
        await fs.writeFile(targetPath, reportHtml, "utf-8");
        summary.push({
          url,
          preset,
          report: fileName,
          scores: Object.fromEntries(
            Object.entries(result.lhr.categories || {}).map(([key, cat]) => [key, cat?.score ?? null]),
          ),
        });
        console.log(`${label} -> saved ${fileName}`);
      } catch (err) {
        const message = err?.friendlyMessage || err?.message || String(err);
        console.error(`${label} -> FAILED: ${message}`);
        failures.push({ url, preset, error: message });
      }
    }
  } finally {
    await chrome.kill();
  }

  return { summary, failures };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const baseUrl = args.base ?? process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000";
  const sitemapPath = args.sitemap ?? "/sitemap.xml";
  const outDir = path.resolve(ROOT, args.outDir ?? path.join("_audit", "lighthouse"));
  const configPath = args.config ?? DEFAULT_CONFIG;
  const verbose = Boolean(args.verbose);
  const presetArg = (args.preset ?? "desktop").toLowerCase();
  const categoriesArg = args.categories ?? "performance,accessibility,best-practices,seo";

  const requestedPresets =
    presetArg === "all"
      ? ["desktop", "mobile"]
      : dedupe(
          presetArg
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item === "desktop" || item === "mobile"),
        );
  const presets = requestedPresets.length ? requestedPresets : ["desktop"];
  const categories = dedupe(
    categoriesArg
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

  const config = await loadConfig(configPath);
  const sitemapRoutes = await fetchSitemapRoutes(baseUrl, sitemapPath);
  const { static: staticRoutes, dynamic: dynamicRoutes } = await collectFilesystemRoutes();

  const collected = new Set();
  sitemapRoutes.forEach((route) => collected.add(normalizePath(route)));
  staticRoutes.forEach((route) => collected.add(normalizePath(route)));
  if (Array.isArray(config.include)) {
    config.include.forEach((route) => collected.add(normalizePath(route)));
  }

  const unresolvedDynamic = [];
  for (const pattern of dynamicRoutes) {
    const replacements = config.dynamic?.[pattern];
    if (Array.isArray(replacements) && replacements.length) {
      replacements.forEach((route) => collected.add(normalizePath(route)));
    } else {
      unresolvedDynamic.push(pattern);
    }
  }

  const excludePatterns = Array.isArray(config.exclude) ? config.exclude : [];
  const filtered = Array.from(collected)
    .filter((route) => !isExcluded(route, excludePatterns))
    .sort();

  if (!filtered.length) {
    console.error("[lighthouse] No routes resolved. Check that the site is running and config is set.");
    process.exit(1);
  }

  const absoluteUrls = filtered.map((route) => toAbsoluteUrl(baseUrl, route));

  await ensureDir(outDir);

  console.log(`[lighthouse] Base URL: ${baseUrl}`);
  console.log(`[lighthouse] Output directory: ${outDir}`);
  console.log(`[lighthouse] Categories: ${categories.join(", ")}`);
  console.log(`[lighthouse] Presets: ${presets.join(", ")}`);
  console.log(`[lighthouse] Resolved ${absoluteUrls.length} URLs to audit:`);
  absoluteUrls.forEach((url) => console.log(`  • ${url}`));

  if (unresolvedDynamic.length) {
    console.warn("[lighthouse] Dynamic routes missing replacements:");
    unresolvedDynamic.forEach((pattern) => console.warn(`  - ${pattern}`));
    console.warn(`[lighthouse] Add replacements under "dynamic" in ${configPath} to audit those paths.`);
  }

  const allSummaries = [];
  const allFailures = [];

  for (const preset of presets) {
    const presetOutDir = path.join(outDir, preset);
    await ensureDir(presetOutDir);
    const result = await runLighthouseBatch(absoluteUrls, preset, {
      outDir: presetOutDir,
      verbose,
      categories: categories.length ? categories : undefined,
      label: `lighthouse:${preset}`,
    });
    allSummaries.push(...result.summary);
    allFailures.push(...result.failures);
  }

  const summaryPath = path.join(outDir, "summary.json");
  await fs.writeFile(
    summaryPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        presets,
        categories,
        routes: allSummaries,
        failures: allFailures,
      },
      null,
      2,
    ),
    "utf-8",
  );

  console.log(`[lighthouse] Summary written to ${summaryPath}`);

  if (allFailures.length) {
    console.error(`[lighthouse] ${allFailures.length} runs failed. See summary for details.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[lighthouse] Unexpected error:", err);
  process.exit(1);
});

