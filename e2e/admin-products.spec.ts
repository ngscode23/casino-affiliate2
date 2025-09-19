import { test, expect } from '@playwright/test'

test.describe('Admin Products (smoke)', () => {
  test.skip(!process.env.ADMIN_E2E, 'Set ADMIN_E2E=1 to run admin smoke')

  test('opens /admin and navigates to Products', async ({ page }) => {
    await page.goto('/admin')
    // If DEV bypass is disabled, this might redirect to login. Allow both.
    const onLogin = page.locator('text=Admin -').first()
    const sidebar = page.locator('text=Products').first()
    if (await onLogin.count()) {
      test.skip(true, 'Admin bypass not active; skipping')
      return
    }
    await expect(sidebar).toBeVisible()
    await sidebar.click()
    await expect(page.locator('h1:has-text("Products")')).toBeVisible()
  })
})

