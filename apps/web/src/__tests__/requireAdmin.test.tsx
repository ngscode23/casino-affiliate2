import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

const mockState: { user: any } = { user: null }
const listeners: Array<(state: any) => void> = []

vi.mock('@shared/lib/authStore', () => ({
  useAuthState: vi.fn(() => mockState),
}))

vi.mock('@shared/lib/auth', () => ({
  ensureSession: vi.fn(() => Promise.resolve()),
  onAuthStateChange: vi.fn((cb: (state: any) => void) => {
    listeners.push(cb)
    return () => {
      const idx = listeners.indexOf(cb)
      if (idx >= 0) listeners.splice(idx, 1)
    }
  }),
}))

import { RequireAdmin } from '@admin/pages/Admin/requireAuth'

function flushListeners() {
  const snapshot = [...listeners]
  snapshot.forEach((cb) => cb(mockState))
}

describe('RequireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.user = null
    listeners.splice(0, listeners.length)
  })

  it('renders children for admin role', async () => {
    mockState.user = { role: 'admin', email: 'admin@example.com' }
    const { findByTestId } = render(
      <MemoryRouter>
        <RequireAdmin>
          <div data-testid="ok">admin ok</div>
        </RequireAdmin>
      </MemoryRouter>
    )
    flushListeners()
    expect((await findByTestId('ok')).textContent).toContain('admin ok')
  })

  it('does not render children for non-admin', async () => {
    mockState.user = { role: 'user', email: 'user@example.com' }
    render(
      <MemoryRouter>
        <RequireAdmin>
          <div data-testid="ok">admin ok</div>
        </RequireAdmin>
      </MemoryRouter>
    )
    flushListeners()
    await Promise.resolve()
    expect(screen.queryByTestId('ok')).toBeNull()
  })
})

