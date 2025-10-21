import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

interface LighthouseRoutesConfig {
  include?: string[];
  exclude?: string[];
  dynamic?: Record<string, string[]>;
}

interface CliOptions {
  baseUrl: string;
  sitemapPath: string;
  routesConfigPath: string;
  outputDir: string;
  viewportWidth: number;
  viewportHeight: number;
  waitAfterNavigate: number;
  navigationTimeout: number;
  deviceScaleFactor: number;
  fullPage: boolean;
  headless: boolean;
  waitUntil: "load" | "domcontentloaded" | "networkidle" | "commit";
  continueOnError: boolean;
  startCommand?: string;
  startReadyPath: string;
  startTimeout: number;
  extraRoutes: string[];
  scrollToBottom: boolean;
  scrollWait: number;
}

const DEFAULT_OPTIONS: CliOptions = {
  baseUrl: process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000",
  sitemapPath: "public/sitemap.xml",
  routesConfigPath: "scripts/lighthouse.routes.json",
  outputDir: "reports/screens",
  viewportWidth: Number.parseInt(process.env.SCREENSHOT_VIEWPORT_W ?? "1920", 10),
  viewportHeight: Number.parseInt(process.env.SCREENSHOT_VIEWPORT_H ?? "1080", 10),
  waitAfterNavigate: Number.parseInt(process.env.SCREENSHOT_WAIT_MS ?? "500", 10),
  navigationTimeout: Number.parseInt(process.env.SCREENSHOT_NAV_TIMEOUT ?? "15000", 10),
  deviceScaleFactor: Number.parseFloat(process.env.SCREENSHOT_DSF ?? "2"),
  fullPage: process.env.SCREENSHOT_FULL_PAGE !== "false",
  headless: process.env.SCREENSHOT_HEADLESS !== "false",
  waitUntil: (process.env.SCREENSHOT_WAIT_UNTIL as CliOptions["waitUntil"]) ?? "load",
  continueOnError: process.env.SCREENSHOT_CONTINUE_ON_ERROR !== "false",
  startCommand: process.env.SCREENSHOT_START_CMD,
  startReadyPath: process.env.SCREENSHOT_START_READY ?? "/",
  startTimeout: Number.parseInt(process.env.SCREENSHOT_START_TIMEOUT ?? "60000", 10),
  extraRoutes: [],
  scrollToBottom: process.env.SCREENSHOT_SCROLL !== "false",
  scrollWait: Number.parseInt(process.env.SCREENSHOT_SCROLL_WAIT ?? "500", 10),
};

function parseArgs(): CliOptions {
  const options: CliOptions = {
    ...DEFAULT_OPTIONS,
    extraRoutes: [...DEFAULT_OPTIONS.extraRoutes],
  };
  const args = process.argv.slice(2);

  const readValue = (arg: string, index: number): [string, number] => {
    const [flag, inline] = arg.split("=", 2);
    if (inline !== undefined) {
      return [inline, index];
    }
    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      return [next, index + 1];
    }
    return ["true", index];
  };

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith("--")) {
      continue;
    }

    const [flag] = token.split("=", 1);
    const normalized = flag.slice(2);

    let consumed = i;
    const consume = () => {
      const [value, nextIndex] = readValue(args[consumed], consumed);
      consumed = nextIndex;
      return value;
    };

    switch (normalized) {
      case "base":
      case "base-url":
        options.baseUrl = consume();
        break;
      case "sitemap":
        options.sitemapPath = consume();
        break;
      case "routes":
      case "routes-config":
        options.routesConfigPath = consume();
        break;
      case "output":
      case "out":
        options.outputDir = consume();
        break;
      case "viewport": {
        const [width, height] = consume().split("x");
        options.viewportWidth = Number.parseInt(
          width ?? String(options.viewportWidth),
          10,
        );
        options.viewportHeight = Number.parseInt(
          height ?? String(options.viewportHeight),
          10,
        );
        break;
      }
      case "wait":
      case "delay":
        options.waitAfterNavigate = Number.parseInt(consume(), 10);
        break;
      case "timeout":
        options.navigationTimeout = Number.parseInt(consume(), 10);
        break;
      case "dsf":
      case "device-scale":
        options.deviceScaleFactor = Number.parseFloat(consume());
        break;
      case "full-page":
        options.fullPage = consume() !== "false";
        break;
      case "headless":
        options.headless = consume() !== "false";
        break;
      case "wait-until": {
        const value = consume() as CliOptions["waitUntil"];
        if (["load", "domcontentloaded", "networkidle", "commit"].includes(value)) {
          options.waitUntil = value;
        } else {
          console.warn(
            `Unsupported wait-until "${value}". Falling back to ${options.waitUntil}.`,
          );
        }
        break;
      }
      case "continue":
      case "continue-on-error":
        options.continueOnError = consume() !== "false";
        break;
      case "start":
      case "start-cmd":
        options.startCommand = consume();
        break;
      case "start-ready":
        options.startReadyPath = consume();
        break;
      case "start-timeout":
        options.startTimeout = Number.parseInt(consume(), 10);
        break;
      case "include": {
        const route = consume();
        options.extraRoutes = [...options.extraRoutes, route];
        break;
      }
      case "scroll":
        options.scrollToBottom = consume() !== "false";
        break;
      case "scroll-wait":
        options.scrollWait = Number.parseInt(consume(), 10);
        break;
      default:
        console.warn(`Unknown option "${token}" - skipping`);
    }
    i = consumed;
  }

  return options;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectUrls(options: CliOptions): Promise<string[]> {
  const candidates = new Set<string>();

  if (await fileExists(options.sitemapPath)) {
    const xml = await fs.readFile(options.sitemapPath, "utf8");
    const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)];
    for (const match of matches) {
      if (match[1]) {
        candidates.add(match[1]);
      }
    }
  } else {
    console.warn(
      `Sitemap not found at "${options.sitemapPath}", falling back to routes config.`,
    );
  }

  if (!candidates.size && (await fileExists(options.routesConfigPath))) {
    const raw = await fs.readFile(options.routesConfigPath, "utf8");
    const config = JSON.parse(raw) as LighthouseRoutesConfig;
    const includes = config.include ?? [];
    const dynamic = Object.values(config.dynamic ?? {}).flat();
    const excludePatterns = (config.exclude ?? []).map((pattern) => {
      if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        return (target: string) => target.startsWith(prefix);
      }
      return (target: string) => target === pattern;
    });

    const shouldInclude = (route: string) =>
      !excludePatterns.some((predicate) => predicate(route));

    for (const route of [...includes, ...dynamic]) {
      if (shouldInclude(route)) {
        candidates.add(route);
      }
    }
  }

  for (const route of options.extraRoutes) {
    candidates.add(route);
  }

  candidates.add("/products");

  if (candidates.size === 0) {
    throw new Error(
      "Unable to collect URLs. Provide a sitemap, a routes config, or pass routes manually.",
    );
  }

  return Array.from(candidates);
}

function toAbsoluteUrl(urlOrPath: string, base: string): string {
  try {
    return new URL(urlOrPath, base).toString();
  } catch (error) {
    throw new Error(`Failed to build URL from "${urlOrPath}": ${String(error)}`);
  }
}

function sanitizeSegment(segment: string): string {
  return segment
    .normalize("NFKD")
    .replace(/[^\w\d-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "segment";
}

function buildFilename(targetUrl: string): string {
  const { hostname, pathname, search, hash } = new URL(targetUrl);
  const segments = pathname.split("/").filter(Boolean).map(sanitizeSegment);
  const baseName = segments.length ? segments.join("__") : "home";

  const extras: string[] = [];
  if (search) {
    extras.push(
      `q_${search.slice(1).replace(/[^\w\d-]+/g, "_").replace(/_+/g, "_")}`,
    );
  }
  if (hash) {
    extras.push(
      `hash_${hash.slice(1).replace(/[^\w\d-]+/g, "_").replace(/_+/g, "_")}`,
    );
  }

  const composed = [sanitizeSegment(hostname), baseName, ...extras]
    .filter(Boolean)
    .join("__")
    .slice(0, 180);

  return `${composed || "page"}.png`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isTimeoutError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const maybe = error as { name?: string; message?: string };
  const normalized = (maybe.message ?? "").toLowerCase();
  return maybe.name === "TimeoutError" || normalized.includes("timeout");
}

async function waitForServer(url: string, timeout: number): Promise<void> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok || (response.status >= 200 && response.status < 500)) {
        return;
      }
    } catch {
      // ignore and retry
    }

    await sleep(1000);
  }

  throw new Error(`Timed out waiting for server at ${url}`);
}

async function ensureStartCommand(options: CliOptions): Promise<() => Promise<void>> {
  const command = options.startCommand?.trim();
  if (!command) {
    return async () => {
      // no-op
    };
  }

  console.log(`[start] ${command}`);
  const child = spawn(command, {
    shell: true,
    stdio: "inherit",
  });

  let exitError: Error | null = null;
  let exited = false;

  child.on("error", (error) => {
    exitError = error;
  });

  child.on("exit", (code, signal) => {
    exited = true;
    if (signal !== "SIGTERM" && code !== 0) {
      exitError = new Error(
        `Start command exited with code ${code ?? "null"}${
          signal ? ` (signal ${signal})` : ""
        }`,
      );
    }
  });

  const readyUrl = new URL(options.startReadyPath, options.baseUrl).toString();

  try {
    await waitForServer(readyUrl, options.startTimeout);
  } catch (error) {
    if (!child.killed) {
      child.kill();
    }
    throw error;
  }

  if (exitError) {
    throw exitError;
  }

  if (exited) {
    throw new Error("Start command finished before the server became ready.");
  }

  return async () => {
    if (!child.killed) {
      child.kill();
      await sleep(500);
    }
  };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const listedUrls = await collectUrls(options);

  await fs.mkdir(options.outputDir, { recursive: true });

  const stopServer = await ensureStartCommand(options);
  const browser = await chromium.launch({ headless: options.headless });
  try {
    const context = await browser.newContext({
      viewport: {
        width: options.viewportWidth,
        height: options.viewportHeight,
      },
      deviceScaleFactor: options.deviceScaleFactor,
    });

    const page = await context.newPage();
    const failures: Array<{ url: string; error: unknown }> = [];

    for (const original of listedUrls) {
      const targetUrl = toAbsoluteUrl(original, options.baseUrl);
      const filename = buildFilename(targetUrl);
      const destination = path.join(options.outputDir, filename);

      console.log(`[open] ${targetUrl}`);
      let navigationError: unknown | null = null;
      try {
        await page.goto(targetUrl, {
          waitUntil: options.waitUntil,
          timeout: options.navigationTimeout,
        });
      } catch (error) {
        navigationError = error;
      }

      const timedOut = navigationError ? isTimeoutError(navigationError) : false;

      if (navigationError && !timedOut) {
        failures.push({ url: targetUrl, error: navigationError });
        console.error(`[error] ${targetUrl} -> ${String(navigationError)}`);
        if (!options.continueOnError) {
          throw navigationError;
        }
        continue;
      }

      if (timedOut) {
        console.warn(
          `[warn] ${targetUrl} -> navigation timed out after ${options.navigationTimeout}ms (waitUntil=${options.waitUntil}). Attempting screenshot anyway.`,
        );
      }

      if (options.waitAfterNavigate > 0) {
        await page.waitForTimeout(options.waitAfterNavigate);
      }

      if (options.scrollToBottom) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
        });
        if (options.scrollWait > 0) {
          await page.waitForTimeout(options.scrollWait);
        }
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
      }

      try {
        await page.screenshot({
          path: destination,
          fullPage: options.fullPage,
        });
        console.log(
          `[saved] ${destination}${timedOut ? " (after navigation timeout)" : ""}`,
        );
      } catch (screenshotError) {
        failures.push({ url: targetUrl, error: screenshotError });
        console.error(
          `[error] ${targetUrl} -> screenshot failed: ${String(screenshotError)}`,
        );
        if (!options.continueOnError) {
          throw screenshotError;
        }
        continue;
      }
    }

    if (failures.length) {
      console.error(
        `Completed with ${failures.length} failures. See log above for details.`,
      );
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    await stopServer();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
