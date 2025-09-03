import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn(),
      },
    },
  }
})

import { RequireAdmin } from '@/pages/Admin/requireAuth'
import { supabase } from '@/lib/supabase'

describe('RequireAdmin', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders children for admin role', async () => {
    ;(supabase.auth.getUser as any).mockResolvedValue({ data: { user: { user_metadata: { role: 'admin' } } } })
    const { findByTestId } = render(
      <MemoryRouter>
        <RequireAdmin>
          <div data-testid="ok">admin ok</div>
        </RequireAdmin>
      </MemoryRouter>
    )
    expect((await findByTestId('ok')).textContent).toContain('admin ok')
  })

  it('does not render children for non-admin', async () => {
    ;(supabase.auth.getUser as any).mockResolvedValue({ data: { user: { user_metadata: { role: 'user' } } } })
    render(
      <MemoryRouter>
        <RequireAdmin>
          <div data-testid="ok">admin ok</div>
        </RequireAdmin>
      </MemoryRouter>
    )
    await Promise.resolve()
    expect(screen.queryByTestId('ok')).toBeNull()
  })
})
