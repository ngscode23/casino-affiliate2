import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// Mock Supabase client used by useSettings
vi.mock('@shared/lib/supabase', () => {
  return {
    supabase: {
      from() {
        return {
          select() {
            return {
              in() {
                return Promise.resolve({
                  data: [
                    { key: 'siteName', value: { value: 'MySite' } },
                    { key: 'siteUrl', value: { value: 'https://mysite.test' } },
                    { key: 'brandLogo', value: { value: '/logo.svg' } },
                    { key: 'gaId', value: { value: 'G-XXXX' } },
                  ],
                  error: null,
                })
              },
            }
          },
        }
      },
    },
  }
})

import { useSettings } from '@shared/lib/useSettings'

function ShowSettings() {
  const { settings } = useSettings()
  return <div data-testid="settings">{settings.siteName}</div>
}

describe('useSettings', () => {
  it('reads settings and caches to localStorage', async () => {
    localStorage.clear()
    render(<ShowSettings />)
    await waitFor(() => expect(screen.getByTestId('settings').textContent).toBe('MySite'))
    const cached = localStorage.getItem('settings-cache-v1')
    expect(cached).toContain('MySite')
  })
})

