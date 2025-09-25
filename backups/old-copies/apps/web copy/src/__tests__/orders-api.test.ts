import { describe, it, expect, beforeEach, vi } from 'vitest'

// In-memory stubs/state for Supabase interactions
const state = {
  userId: 'u1',
  ordersOwnerId: 'u1',
  orderId: '11111111-1111-1111-1111-111111111111',
  orderStatus: 'pending' as string,
  orderCurrency: 'EUR',
  orderTotal: 50 as number,
  payments: [] as Array<{ status: string; created_at: string }>,
}

// Supabase client mock
vi.mock('@supabase/supabase-js', () => {
  function makeQuery(table: string) {
    const query: any = {
      _filters: [] as Array<{ col: string; op: string; val: any }>,
      _order: null as null | { col: string; asc: boolean },
      _range: null as null | { from: number; to: number },
      select(_cols?: any, opts?: any) {
        // listing
        if (table === 'order_v2' && opts?.count === 'exact') {
          // apply simple filters
          let rows = [
            {
              id: state.orderId,
              created_at: new Date().toISOString(),
              amount_total: state.orderTotal,
              currency: state.orderCurrency,
              status: state.orderStatus,
              payment_status: (state.payments.length ? state.payments[state.payments.length - 1].status : null) || null,
              user_id: state.userId,
            },
          ]
          for (const f of query._filters) {
            rows = rows.filter((r: any) => {
              if (f.op === 'eq') return String(r[f.col]) === String(f.val)
              if (f.op === 'ilike') return String(r[f.col]).includes(String(f.val).split('%').join(''))
              if (f.op === 'gte') return new Date(r[f.col]).getTime() >= new Date(f.val).getTime()
              if (f.op === 'lte') return new Date(r[f.col]).getTime() <= new Date(f.val).getTime()
              return true
            })
          }
          const count = rows.length
          if (query._order) {
            rows.sort((a: any, b: any) => {
              const va = a[query._order!.col];
              const vb = b[query._order!.col];
              return (va > vb ? 1 : -1) * (query._order!.asc ? 1 : -1)
            })
          }
          if (query._range) rows = rows.slice(query._range.from, query._range.to + 1)
          return Promise.resolve({ data: rows, error: null, count })
        }
        // details
        if (table === 'order_v2') {
          const row = {
            id: state.orderId,
            user_id: state.userId,
            created_at: new Date().toISOString(),
            amount_subtotal: state.orderTotal,
            amount_discounts: 0,
            amount_tax: 0,
            amount_total: state.orderTotal,
            currency: state.orderCurrency,
            status: state.orderStatus,
            payment_status: (state.payments.length ? state.payments[state.payments.length - 1].status : null) || null,
          }
          return Promise.resolve({ data: row, error: null })
        }
        if (table === 'order_items') {
          return Promise.resolve({ data: [
            { id: 'it1', order_id: state.orderId, product_id: 'p1', title: 'Alpha', qty: 1, unit_price: state.orderTotal, total: state.orderTotal },
          ], error: null })
        }
        if (table === 'payments') {
          return {
            select() { return this },
            eq() { return this },
            order() { return this },
            limit() { return this },
            maybeSingle() {
              const last = state.payments.length ? state.payments[state.payments.length - 1] : undefined
              return Promise.resolve({ data: last ? { id: 'pay1', status: last.status, amount: state.orderTotal, currency: state.orderCurrency, provider: 'mock', provider_ref: 'x', created_at: last.created_at } : null, error: null })
            },
          }
        }
        return Promise.resolve({ data: null, error: null })
      },
      eq(col: string, val: any) { this._filters.push({ col, op: 'eq', val }); return this },
      ilike(col: string, val: any) { this._filters.push({ col, op: 'ilike', val }); return this },
      gte(col: string, val: any) { this._filters.push({ col, op: 'gte', val }); return this },
      lte(col: string, val: any) { this._filters.push({ col, op: 'lte', val }); return this },
      order(col: string, opts?: { ascending?: boolean }) { this._order = { col, asc: !!opts?.ascending }; return this },
      range(from: number, to: number) { this._range = { from, to }; return this },
      single() { return this.select() },
      maybeSingle() { return this.select() },
      insert(row: any) {
        if (table === 'payments') {
          state.payments.push({ status: row.status, created_at: new Date().toISOString() })
          // имитируем триггер: authorized → processing
          if (row.status === 'authorized' && state.orderStatus === 'pending') state.orderStatus = 'processing'
          if (row.status === 'succeeded') state.orderStatus = 'succeeded'
          if (row.status === 'failed') state.orderStatus = 'failed'
          return Promise.resolve({ data: { id: 'pay1' }, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      update(patch: any) {
        if (table === 'orders') {
          if (patch?.status) state.orderStatus = patch.status
          return { eq() { return Promise.resolve({ data: null, error: null }) } }
        }
        return { eq() { return Promise.resolve({ data: null, error: null }) } }
      },
    }
    if (table === 'orders') {
      // special case for reading owner/status
      return {
        select() { return this },
        eq() { return this },
        single() { return Promise.resolve({ data: { id: state.orderId, user_id: state.ordersOwnerId, status: state.orderStatus, currency: state.orderCurrency }, error: null }) },
        update: (patch: any) => query.update(patch),
      } as any
    }
    return query
  }

  const supabase = {
    auth: {
      getUser() {
        return Promise.resolve({ data: { user: { id: state.userId } }, error: null as any })
      },
      getSession() { return Promise.resolve({ data: { session: { access_token: 't' } } }) },
    },
    rpc(name: string, args: any) {
      if (name === 'place_order' || name === 'place_order_with_items') {
        return Promise.resolve({ data: state.orderId, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    },
    from(table: string) { return makeQuery(table) },
  }
  return { createClient: () => supabase }
})

function authHeader() {
  return { authorization: 'Bearer test-user-token' }
}

describe('orders function API', () => {
  beforeEach(() => {
    // reset state and env
    state.orderStatus = 'pending'
    state.orderTotal = 50
    state.payments.length = 0
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SECRET_KEY = 'srv'
  })

  it('POST /orders creates and validates totals (201)', async () => {
    const mod: any = await import('../../netlify/functions/orders')
    const event: any = {
      httpMethod: 'POST',
      path: '/api/orders',
      headers: authHeader(),
      body: JSON.stringify({ items: [{ id: 'p1', qty: 1 }], currency: 'EUR' }),
    }
    const res: any = await mod.handler(event)
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(true)
    expect(body.order_id).toBe(state.orderId)
  })

  it('POST /orders returns 422 when total invalid (0)', async () => {
    state.orderTotal = 0
    const mod: any = await import('../../netlify/functions/orders')
    const event: any = {
      httpMethod: 'POST',
      path: '/api/orders',
      headers: authHeader(),
      body: JSON.stringify({ items: [{ id: 'p1', qty: 1 }] }),
    }
    const res: any = await mod.handler(event)
    expect(res.statusCode).toBe(422)
  })

  it('GET /orders lists orders with pagination', async () => {
    const mod: any = await import('../../netlify/functions/orders')
    const event: any = {
      httpMethod: 'GET',
      path: '/api/orders',
      headers: authHeader(),
      queryStringParameters: { sort: 'created_at desc', page: '1', page_size: '10' },
    }
    const res: any = await mod.handler(event)
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.count).toBeGreaterThanOrEqual(1)
  })

  it('POST /orders/:id/confirm-payment sets payment and returns scenario', async () => {
    const mod: any = await import('../../netlify/functions/orders')
    const event: any = {
      httpMethod: 'POST',
      path: `/api/orders/${state.orderId}/confirm-payment`,
      headers: authHeader(),
      queryStringParameters: { scenario: 'authorized' },
    }
    const res: any = await mod.handler(event)
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(true)
    expect(body.status).toBe('authorized')
    // триггер-эффект имитируется моками: pending -> processing
    expect(state.orderStatus).toBe('processing')
  })

  it('POST /orders/:id/cancel cancels pending order', async () => {
    state.orderStatus = 'pending'
    const mod: any = await import('../../netlify/functions/orders')
    const event: any = {
      httpMethod: 'POST',
      path: `/api/orders/${state.orderId}/cancel`,
      headers: authHeader(),
    }
    const res: any = await mod.handler(event)
    expect(res.statusCode).toBe(200)
  })

  it('POST /orders/:id/cancel foreign order -> 403', async () => {
    state.orderStatus = 'pending'
    state.ordersOwnerId = 'u2' // владелец другой
    const mod: any = await import('../../netlify/functions/orders')
    const event: any = {
      httpMethod: 'POST',
      path: `/api/orders/${state.orderId}/cancel`,
      headers: authHeader(),
    }
    const res: any = await mod.handler(event)
    expect(res.statusCode).toBe(403)
    // вернуть владельца по умолчанию для следующих тестов
    state.ordersOwnerId = state.userId
  })

  it('POST /orders/:id/cancel when not pending -> 409', async () => {
    state.orderStatus = 'processing'
    const mod: any = await import('../../netlify/functions/orders')
    const event: any = {
      httpMethod: 'POST',
      path: `/api/orders/${state.orderId}/cancel`,
      headers: authHeader(),
    }
    const res: any = await mod.handler(event)
    expect(res.statusCode).toBe(409)
  })

  it('POST /orders/:id/confirm-payment scenario=failed -> order failed', async () => {
    state.orderStatus = 'pending'
    const mod: any = await import('../../netlify/functions/orders')
    const event: any = {
      httpMethod: 'POST',
      path: `/api/orders/${state.orderId}/confirm-payment`,
      headers: authHeader(),
      queryStringParameters: { scenario: 'failed' },
    }
    const res: any = await mod.handler(event)
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(true)
    expect(body.status).toBe('failed')
    expect(state.orderStatus).toBe('failed')
  })

  it('POST /orders/:id/confirm-payment after succeeded -> 409', async () => {
    state.orderStatus = 'succeeded'
    const mod: any = await import('../../netlify/functions/orders')
    const event: any = {
      httpMethod: 'POST',
      path: `/api/orders/${state.orderId}/confirm-payment`,
      headers: authHeader(),
      queryStringParameters: { scenario: 'authorized' },
    }
    const res: any = await mod.handler(event)
    expect(res.statusCode).toBe(409)
  })
})

