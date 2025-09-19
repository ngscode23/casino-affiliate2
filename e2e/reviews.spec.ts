import { test, expect } from '@playwright/test'

test.describe('Reviews API (routing and errors)', () => {
  test('GET list supports trailing slash and returns ok', async ({ request }) => {
    const uuid = '00000000-0000-4000-8000-000000000000'
    const u1 = `/.netlify/functions/reviews/list?source_schema=public&source_table=ecom_products&source_pk=${uuid}`
    const u2 = `/.netlify/functions/reviews/list/?source_schema=public&source_table=ecom_products&source_pk=${uuid}`

    const r1 = await request.get(u1)
    expect(r1.status()).toBe(200)
    const j1 = await r1.json()
    expect(j1.ok).toBe(true)
    expect(Array.isArray(j1.items)).toBe(true)
    // stats может быть null или объект
    expect('stats' in j1).toBe(true)

    const r2 = await request.get(u2)
    expect(r2.status()).toBe(200)
    const j2 = await r2.json()
    expect(j2.ok).toBe(true)
    expect(Array.isArray(j2.items)).toBe(true)
    expect('stats' in j2).toBe(true)
  })

  test('POST add without auth → 401 unauthorized', async ({ request }) => {
    const uuid = '00000000-0000-4000-8000-000000000000'
    const r = await request.post('/.netlify/functions/reviews/add', {
      data: JSON.stringify({ product_id: uuid, rating: 5, title: 'T', body: 'B' }),
      headers: { 'content-type': 'application/json' },
    })
    expect(r.status()).toBe(401)
    const j = await r.json()
    expect(j).toMatchObject({ ok: false, code: 'unauthorized' })
  })

  test('Admin pending unauthorized (with and without slash)', async ({ request }) => {
    const r1 = await request.get('/.netlify/functions/reviews-admin/pending')
    expect(r1.status()).toBe(401)
    const j1 = await r1.json()
    expect(j1).toMatchObject({ ok: false, code: 'unauthorized' })

    const r2 = await request.get('/.netlify/functions/reviews-admin/pending/')
    expect(r2.status()).toBe(401)
    const j2 = await r2.json()
    expect(j2).toMatchObject({ ok: false, code: 'unauthorized' })
  })

  test('Admin approve route matches and requires POST + token', async ({ request }) => {
    // Без токена хоть GET, хоть POST вернёт 401, но важен матчинг маршрута со слэшем
    const r1 = await request.get('/.netlify/functions/reviews-admin/approve')
    expect(r1.status()).toBe(401)
    const r2 = await request.get('/.netlify/functions/reviews-admin/approve/')
    expect(r2.status()).toBe(401)
  })
})

