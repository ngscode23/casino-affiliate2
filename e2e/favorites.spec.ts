// import { test, expect } from "@playwright/test";

// test("favorites lifecycle", async ({ page }) => {
//   const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

//   await page.goto(`${base}/compare`, { waitUntil: "networkidle" });
//   await page.evaluate(() => localStorage.setItem("fav:v1", JSON.stringify([])));

//   const favVisible = '[data-testid^="fav-btn:"]';

//   // кликаем по первой ВИДИМОЙ звезде (Playwright сам дождётся видимости)
//   await page.locator(favVisible).first().click();

//   // проверяем, что что-то сохранилось
//   const saved = await page.evaluate(() =>
//     JSON.parse(localStorage.getItem("fav:v1") || "[]")
//   );
//   expect(saved.length).toBeGreaterThan(0);

//   // Favorites показывает карточку
//   await page.goto(`${base}/favorites`, { waitUntil: "networkidle" });
//   await expect(page.locator("text=Избранное")).toBeVisible();
//   const favCount = await page.locator(favVisible).count();
//   expect(favCount).toBeGreaterThan(0);

//   // снимаем из избранного
//   await page.locator(favVisible).first().click();
//   const savedAfter = await page.evaluate(() =>
//     JSON.parse(localStorage.getItem("fav:v1") || "[]")
//   );
//   expect(savedAfter.length).toBeLessThan(saved.length);
// });