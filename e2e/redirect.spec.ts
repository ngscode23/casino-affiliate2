import { test, expect } from '@playwright/test'

const PREVIEW = process.env.PREVIEW_URL || ''
const BASE = PREVIEW.replace(/\/$/, '')
const SLUG = process.env.TEST_SLUG || 'lucky-star'

test.skip(!PREVIEW, 'PREVIEW_URL not set')

async function countClicks(request: any, sinceSec = 600) {
  const url = `${BASE}/.netlify/functions/test-click-count?slug=${encodeURIComponent(SLUG)}&since_sec=${sinceSec}`
  const res = await request.get(url)
  expect(res.ok()).toBeTruthy()
  const j = await res.json()
  return Number(j?.count || 0)
}

test('bot UA (Slack) → 302, no insert', async ({ request }) => {
  const before = await countClicks(request, 120)
  const res = await request.get(`${BASE}/.netlify/functions/go/${encodeURIComponent(SLUG)}`, {
    headers: { 'user-agent': 'Slackbot 1.0 (+https://api.slack.com/robots)' },
    maxRedirects: 0
  })
  expect([301,302,303,307,308]).toContain(res.status())
  const after = await countClicks(request, 120)
  expect(after - before).toBe(0)
})

test('normal UA → 302', async ({ request }) => {
  const before = await countClicks(request, 120)
  const res = await request.get(`${BASE}/.netlify/functions/go/${encodeURIComponent(SLUG)}`, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
    maxRedirects: 0
  })
  expect([301,302,303,307,308]).toContain(res.status())
  const after = await countClicks(request, 120)
  expect(after - before).toBeGreaterThanOrEqual(1)
})

test('two clicks within window → one effective insert', async ({ request }) => {
  const before = await countClicks(request, 120)
  const url = `${BASE}/.netlify/functions/go/${encodeURIComponent(SLUG)}`
  const headers = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/115 Safari/537.36', 'x-forwarded-for': '203.0.113.55' }
  await request.get(url, { headers, maxRedirects: 0 })
  await request.get(url, { headers, maxRedirects: 0 })
  const after = await countClicks(request, 120)
  expect(after - before).toBe(1)
})

test('location header contains tracking params and respects incoming subid', async ({ request }) => {
  const url = `${BASE}/.netlify/functions/go/${encodeURIComponent(SLUG)}?subid=mycid&utm_source=testsrc`
  const res = await request.get(url, { maxRedirects: 0 })
  expect([301,302,303,307,308]).toContain(res.status())
  const loc = res.headers()['location'] || ''
  expect(loc).toContain('utm_source=testsrc')
  // Should not override provided subid
  expect(loc).toContain('subid=mycid')
  // Always attaches click_id
  expect(loc).toMatch(/click_id=[^&]+/)
})

test('bad slug returns 404 not_found', async ({ request }) => {
  const bad = `nonexistent-${Date.now().toString(36)}`
  const res = await request.get(`${BASE}/.netlify/functions/go/${encodeURIComponent(bad)}`, { maxRedirects: 0 })
  expect(res.status()).toBe(404)
  const body = await res.json()
  expect(['not_found','No slug']).toContain(body?.error)
})

test.skip(!!process.env.SKIP_SLOW_E2E, 'slow test skipped by env')('two clicks outside window → two inserts', async ({ request }) => {
  const before = await countClicks(request, 180)
  const url = `${BASE}/.netlify/functions/go/${encodeURIComponent(SLUG)}`
  const headers = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/115 Safari/537.36', 'x-forwarded-for': '203.0.113.77' }
  await request.get(url, { headers, maxRedirects: 0 })
  // Wait slightly more than default 5s rate-limit window
  await new Promise(r => setTimeout(r, 6000))
  await request.get(url, { headers, maxRedirects: 0 })
  const after = await countClicks(request, 180)
  expect(after - before).toBeGreaterThanOrEqual(2)
})


