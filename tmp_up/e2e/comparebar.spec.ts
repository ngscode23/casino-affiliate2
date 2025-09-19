import { test, expect } from '@playwright/test'

const PREVIEW = process.env.PREVIEW_URL || ''
const BASE = PREVIEW.replace(/\/$/, '')

test.skip(!PREVIEW, 'PREVIEW_URL not set')

test('CompareBar shows hint with one selection and enables on two', async ({ page }) => {
  await page.goto(`${BASE}/offers`)

  // Click first two compare toggles
  const toggles = page.locator('[data-testid="compare-toggle"]')
  await expect(toggles.first()).toBeVisible()

  // Select first -> hint appears, open disabled
  await toggles.nth(0).click()
  await expect(page.locator('[data-testid="compare-hint"]')).toBeVisible()
  const openBtn = page.locator('[data-testid="compare-open-btn"]')
  await expect(openBtn).toBeDisabled()

  // Select second -> hint disappears, open enabled
  await toggles.nth(1).click()
  await expect(page.locator('[data-testid="compare-hint"]')).toHaveCount(0)
  await expect(openBtn).toBeEnabled()
})

