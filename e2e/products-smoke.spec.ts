import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test.use({
  baseURL: BASE_URL,
  viewport: { width: 1400, height: 900 },
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("products catalog search, filters, dataset toggle, and lazy loading smoke", async ({ page, request }) => {
  const catalogResponse = await request.get("/api/ecom-products?limit=1");
  expect(catalogResponse.ok()).toBeTruthy();
  const catalogJson = await catalogResponse.json();
  const sampleProduct = Array.isArray(catalogJson?.items) ? catalogJson.items[0] : null;
  const catalogTotal = Number(catalogJson?.total ?? 0);

  const rawTitle =
    (typeof sampleProduct?.title === "string" && sampleProduct.title) ||
    (typeof sampleProduct?.name === "string" && sampleProduct.name) ||
    (typeof sampleProduct?.slug === "string" && sampleProduct.slug) ||
    "pro";
  const keyword =
    rawTitle
      .split(/[\s-]/)
      .map((part: string) => part.trim())
      .find(Boolean) ?? "pro";

  await page.goto("/products");
  await page.waitForLoadState("networkidle");

  const productCards = page.locator('[data-product-grid] [role="listitem"]');
  await expect(productCards.first()).toBeVisible();

  // Search smoke
  const filtersAppliedBanner = page.locator("span", { hasText: /filter[s]? applied/i });
  const searchInput = page.getByPlaceholder("Search the catalog...");
  await searchInput.fill(keyword);
  await expect(filtersAppliedBanner).toHaveText(/1 filter applied/i);
  const keywordRegex = new RegExp(escapeRegExp(keyword), "i");
  await expect(
    page.locator('[data-product-grid] h3').filter({ hasText: keywordRegex }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(filtersAppliedBanner).toHaveCount(0);

  // Dataset toggle smoke
  await page.getByRole("button", { name: "Neon shop" }).click();
  await expect(page).toHaveURL(/dataset=shop/);
  await expect(filtersAppliedBanner).toHaveText(/1 filter applied/i);

  // Rating filter smoke via sidebar
  await page.getByRole("button", { name: /^Filters\b/i }).click();
  const filtersPanel = page.getByRole("complementary", { name: "Product filters" });
  await expect(filtersPanel).toBeVisible();
  await filtersPanel.getByRole("button", { name: /Minimum rating/i }).click();
  await filtersPanel.getByRole("button", { name: "4.0+" }).click();
  await expect(filtersAppliedBanner).toHaveText(/2 filters applied/i);
  await filtersPanel.getByRole("button", { name: "Any rating" }).click();
  await expect(filtersAppliedBanner).toHaveText(/1 filter applied/i);
  await filtersPanel.getByRole("button", { name: "Reset" }).click();
  await expect(filtersAppliedBanner).toHaveCount(0);
  await page.getByRole("button", { name: /^Filters\b/i }).click();

  const initialCardCount = await productCards.count();
  test.skip(
    catalogTotal <= initialCardCount,
    "Недостаточно товаров, чтобы проверить ленивую загрузку.",
  );

  await page.getByTestId("catalog-sentinel").scrollIntoViewIfNeeded();
  await expect
    .poll(async () => productCards.count(), {
      message: "Ожидали появления дополнительных карточек после прокрутки.",
    })
    .toBeGreaterThan(initialCardCount);
});

