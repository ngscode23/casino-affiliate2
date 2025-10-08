import { test, expect } from "@playwright/test";

test.describe("Admin Analytics (smoke)", () => {
  test.skip(!process.env.ADMIN_E2E, "Set ADMIN_E2E=1 to run admin smoke");

  test("opens /admin/analytics and renders dashboard", async ({ page }) => {
    await page.goto("/admin/analytics");

    const loginHeading = page.locator("text=Admin -").first();
    if (await loginHeading.count()) {
      test.skip(true, "Admin bypass not active; skipping");
      return;
    }

    await expect(page.locator("h1:has-text('Analytics')")).toBeVisible();
    await expect(page.getByLabel("Range")).toBeVisible();
  });
});
