#!/usr/bin/env node
// extract-skeleton.mjs
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const argv = process.argv.slice(2);
  const opts = { url: null, out: "skeleton.html", headful: false, userDataDir: null, wait: 800, ready: null, cookies: null };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i++];
    if (!opts.url && !a.startsWith("--")) { opts.url = a; continue; }
    if (a === "--headful") opts.headful = true;
    else if (a === "--user-data-dir") opts.userDataDir = argv[i++] || null;
    else if (a === "--wait") opts.wait = parseInt(argv[i++] || "800", 10);
    else if (a === "--ready") opts.ready = argv[i++] || null;
    else if (a === "--cookies") opts.cookies = argv[i++] || null;
    else if (a === "--out") opts.out = argv[i++] || "skeleton.html";
    else {
      console.warn("Unknown arg:", a);
    }
  }
  return opts;
}

const opts = parseArgs();
if (!opts.url) {
  console.error("Usage: node extract-skeleton.mjs <url> [--out file] [--headful] [--user-data-dir dir] [--wait ms] [--ready <selector|text>] [--cookies cookies.json]");
  process.exit(1);
}

const outAbs = path.resolve(process.cwd(), opts.out);
const screenshotAbs = path.resolve(process.cwd(), (path.basename(opts.out, path.extname(opts.out)) + ".png"));

(async () => {
  console.log("▶ URL:", opts.url);
  console.log("▶ Will write HTML to:", outAbs);
  console.log("▶ Screenshot:", screenshotAbs);

  const launchOptions = {
    headless: opts.headful ? false : "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  if (opts.userDataDir) launchOptions.userDataDir = path.resolve(process.cwd(), opts.userDataDir);

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  // set common UA to reduce headless detection
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

  // if cookies file provided, try to set cookies (must be JSON array of cookie objects)
  if (opts.cookies) {
    try {
      const raw = await fs.readFile(path.resolve(process.cwd(), opts.cookies), "utf8");
      const cookies = JSON.parse(raw);
      if (Array.isArray(cookies)) {
        await page.setCookie(...cookies);
        console.log("✔ cookies applied from", opts.cookies);
      } else console.warn("Cookies file is not an array; skipping.");
    } catch (e) {
      console.warn("Could not load cookies:", e.message);
    }
  }

  // block heavy resources
  await page.setRequestInterception(true);
  page.on("request", req => {
    const t = req.resourceType();
    if (["image", "media", "font"].includes(t)) req.abort();
    else req.continue();
  });

  page.on("console", msg => console.log("PAGE LOG:", msg.text()));
  page.on("pageerror", err => console.error("PAGE ERROR:", err.message || err));
  page.on("response", res => {
    if (res.status() >= 400) console.log("HTTP", res.status(), res.url());
  });

  console.log("▶ Navigating…");
  try {
    await page.goto(opts.url, { waitUntil: "networkidle2", timeout: 120000 });
  } catch (e) {
    console.warn("Navigate warning:", e.message);
  }

  // If user wants to wait for a selector or text to indicate page is ready
  if (opts.ready) {
    console.log("▶ waiting for ready signal:", opts.ready);
    try {
      if (opts.ready.startsWith("/") || opts.ready.startsWith(".") || opts.ready.startsWith("#")) {
        await page.waitForSelector(opts.ready, { timeout: 120000 });
      } else {
        // text-based: wait until document.body.innerText includes the phrase
        await page.waitForFunction(
          (txt) => document.body && document.body.innerText && document.body.innerText.indexOf(txt) !== -1,
          { timeout: 120000 },
          opts.ready
        );
      }
      console.log("✔ ready signal found");
    } catch (e) {
      console.warn("ready wait timed out:", e.message);
    }
  }

  // If headful mode and the page likely requires manual interaction (captcha, age gate), pause and ask user to press Enter in terminal.
  if (opts.headful) {
    console.log("▶ Headful mode: if you need to pass captcha / date gate, do it in the opened browser.");
    console.log("▶ When done, press ENTER in this terminal to continue extraction.");
    await new Promise((res) => {
      process.stdin.resume();
      process.stdin.on("data", () => {
        process.stdin.pause();
        res();
      });
    });
  } else {
    // small wait (fallback if waitForTimeout missing in this Puppeteer)
    const msWait = Number.isFinite(opts.wait) ? opts.wait : 800;
    await (page.waitForTimeout ? page.waitForTimeout(msWait) : new Promise(r => setTimeout(r, msWait)));
  }

  console.log("▶ Taking screenshot…");
  try {
    await page.screenshot({ path: screenshotAbs, fullPage: true });
    console.log("✔ Screenshot saved:", screenshotAbs);
  } catch (e) {
    console.warn("Screenshot failed:", e.message);
  }

  console.log("▶ Extracting skeleton + styles…");
  // First, extract skeleton HTML (keep tags and classes only)
  const skeleton = await page.evaluate(() => {
    const ALLOWED = new Set([
      "HTML","HEAD","BODY","MAIN","HEADER","FOOTER","NAV","ASIDE",
      "SECTION","ARTICLE","DIV","SPAN","UL","OL","LI","A",
      "H1","H2","H3","H4","H5","H6","P","BUTTON","IMG","INPUT","FORM","LABEL"
    ]);
    function cloneWithClasses(src) {
      if (src.nodeType !== Node.ELEMENT_NODE) return null;
      const tag = src.tagName;
      const el = document.createElement(ALLOWED.has(tag) ? tag : "DIV");
      if (src.classList && src.classList.length) el.setAttribute("class", Array.from(src.classList).join(" "));
      // preserve simple attributes useful for structure
      if (src.id) el.setAttribute("id", src.id);
      if (src.getAttribute && src.getAttribute("role")) el.setAttribute("role", src.getAttribute("role"));
      for (const child of src.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const name = child.tagName;
          if (["SCRIPT","STYLE","LINK"].includes(name)) continue;
          const c = cloneWithClasses(child);
          if (c) el.appendChild(c);
        } else if (child.nodeType === Node.TEXT_NODE) {
          // small text nodes can be preserved (trim to avoid huge dumps)
          const t = child.textContent.trim();
          if (t.length > 0 && t.length < 200) {
            el.appendChild(document.createTextNode(t));
          }
        }
      }
      return el;
    }
    const root = cloneWithClasses(document.documentElement);
    const body = root && root.querySelector("body");
    if (body) {
      const wrap = document.createElement("div");
      wrap.className = "legacy";
      while (body.firstChild) wrap.appendChild(body.firstChild);
      body.appendChild(wrap);
    }
    return "<!doctype html>\n" + (root ? root.outerHTML : document.documentElement.outerHTML);
  });

  // Next: collect styles: inline <style> contents + try to fetch linked CSS files
  const cssBundle = await page.evaluate(async () => {
    // collect inline <style>
    const styles = Array.from(document.querySelectorAll("style")).map(s => s.textContent || "");
    // collect linked css hrefs
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href).filter(Boolean);
    // attempt to fetch each link (browser context — will follow same-origin rules + cookies)
    const fetched = [];
    for (const href of links) {
      try {
        const resp = await fetch(href, { method: "GET", credentials: "include" });
        if (resp.ok) {
          const txt = await resp.text();
          fetched.push(`/* ${href} */\n` + txt);
        } else {
          fetched.push(`/* ${href} => HTTP ${resp.status} */`);
        }
      } catch (e) {
        fetched.push(`/* ${href} => fetch error: ${e.message} */`);
      }
    }
    return { inline: styles.join("\n\n"), linked: fetched.join("\n\n") };
  });

  // Save skeleton and CSS
  await fs.writeFile(outAbs, skeleton, "utf8");
  const cssOut = path.resolve(path.dirname(outAbs), path.basename(outAbs, path.extname(outAbs)) + ".styles.css");
  const cssText = `/* inline styles */\n\n${cssBundle.inline}\n\n/* fetched linked styles (or errors) */\n\n${cssBundle.linked}\n`;
  await fs.writeFile(cssOut, cssText, "utf8");

  console.log("✔ HTML saved:", outAbs);
  console.log("✔ CSS saved:", cssOut);

  await browser.close();
  console.log("✔ Done");
})().catch(async (e) => {
  console.error("✖ FAILED:", e?.stack || e);
  process.exit(1);
});