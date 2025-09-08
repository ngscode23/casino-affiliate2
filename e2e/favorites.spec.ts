import { test, expect } from "@playwright/test";

test("favorites lifecycle", async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

  await page.goto(`${base}/compare`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("fav:v1", JSON.stringify([])));

  const favVisible = '[data-testid^="fav-btn:"]';

  // кликаем по первой ВИДИМОЙ звезде (Playwright дождётся видимости)
  await page.locator(favVisible).first().click();

  // проверяем, что что-то сохранилось
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("fav:v1") || "[]")
  );
  expect(saved.length).toBeGreaterThan(0);

  // Favorites показывает карточку
  await page.goto(`${base}/favorites`, { waitUntil: "networkidle" });
  await expect(page.locator("text=Избранное")).toBeVisible();
  const favCount = await page.locator(favVisible).count();
  expect(favCount).toBeGreaterThan(0);

  // снимаем из избранного
  await page.locator(favVisible).first().click();
  const savedAfter = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("fav:v1") || "[]")
  );
  expect(savedAfter.length).toBeLessThan(saved.length);
});

test("favorites import via ?list= and share copies URL", async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

  // Start with empty favorites
  await page.goto(`${base}/compare`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("fav:v1", JSON.stringify([])));

  // Import from URL
  await page.goto(`${base}/favorites?list=lucky-star`, { waitUntil: "networkidle" });
  // Import banner appears
  await page.getByRole('button', { name: /Импортировать|Import/i }).click();

  // Verify item stored
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fav:v1') || '[]'));
  expect(saved).toContain('lucky-star');

  // Stub clipboard and click Share
  await page.addInitScript(() => {
    // @ts-ignore
    window._copied = '';
    // @ts-ignore
    navigator.clipboard = { writeText: (t) => { /* @ts-ignore */ window._copied = t; return Promise.resolve(); } };
  });

  await page.getByRole('button', { name: /Поделиться списком|Share list/i }).click();
  const copied = await page.evaluate(() => (window as any)._copied);
  expect(String(copied)).toContain('/favorites?list=');
  expect(String(copied)).toContain('lucky-star');
});
