import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from(table: string) {
        return {
          select() { return this },
          order() { return this },
          range() {
            return Promise.resolve({ data: [
              { id: '1', type: 'checkout.session.completed', created_at: '2025-01-01T00:00:00Z', payload: { id: 'evt_1', type: 'checkout.session.completed' } },
            ], error: null })
          },
        }
      }
    }
  }
})

import WebhooksPage from '@/pages/Admin/webhooks'

describe('Admin/Webhooks page', () => {
  it('renders list snapshot', async () => {
    const { container, findByText } = render(
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>
    )
    await findByText('Webhook Logs')
    expect(container).toMatchSnapshot()
  })
})

