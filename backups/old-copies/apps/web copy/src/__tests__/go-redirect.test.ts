import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client used in the Netlify function
const insertRows: any[] = []
vi.mock('@supabase/supabase-js', () => {
  const supabase = {
    from(table: string) {
      if (table === 'offers') {
        return {
          select() { return this },
          eq() { return this },
          limit() { return this },
          maybeSingle() { return Promise.resolve({ data: { link: 'https://example.com/offer?x=1', enabled: true }, error: null }) },
        }
      }
      if (table === 'clicks') {
        return {
          insert(row: any) {
            insertRows.push(row)
            return Promise.resolve({ data: null, error: null })
          },
        }
      }
      return {} as any
    },
  }
  return { createClient: () => supabase }
})


describe('/go redirect', () => {
  beforeEach(() => {
    insertRows.length = 0
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SECRET_KEY = 'srv'
  })

  it('propagates UTM into clicks.params and sets ip_hash', async () => {
    const event: any = {
      path: '/api/go/slug-1',
      queryStringParameters: { utm_source: 'testsrc', utm_campaign: 'cmp' },
      headers: { 'x-forwarded-for': '1.2.3.4' },
    }
    const mod: any = await import('../../netlify/functions/go')
    const res: any = await mod.handler(event)
    expect(res.statusCode).toBe(302)
    expect(typeof res.headers?.Location).toBe('string')
    // ensure row was "inserted"
    expect(insertRows.length).toBe(1)
    const row = insertRows[0]
    expect(row?.params?.utm_source).toBe('testsrc')
    expect(typeof row?.ip_hash).toBe('string')
    expect((row?.ip_hash as string).length).toBeGreaterThan(0)
  })
})

