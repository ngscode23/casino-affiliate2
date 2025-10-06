import puppeteer from "puppeteer";
import fs from "fs/promises";

const url = process.argv[2];
const out = process.argv[3] || "cf-cookies.json";
if (!url) { console.error("Usage: node tools/save-cookies.mjs <url> [out.json]"); process.exit(1); }

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });
  console.log("=> В окне браузера: пройди капчу/логин. Нажми Enter сюда, когда готов.");
  await new Promise(resolve => process.stdin.once("data", resolve));
  const cookies = await page.cookies();
  await fs.writeFile(out, JSON.stringify(cookies, null, 2), "utf8");
  console.log("Saved cookies to", out);
  await browser.close();
})();