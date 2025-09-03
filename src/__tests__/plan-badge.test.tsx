import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { PlanBadge } from '@/pages/AffiliateHome'

describe('PlanBadge', () => {
  it('renders TOP label', () => {
    render(<PlanBadge plan="TOP" />)
    expect(!!screen.getByText('TOP')).toBe(true)
  })
  it('renders FEATURED label', () => {
    render(<PlanBadge plan="FEATURED" />)
    expect(!!screen.getByText('FEATURED')).toBe(true)
  })
  it('renders nothing when no plan', () => {
    const { container } = render(<PlanBadge /> as any)
    expect(container.textContent).toBe('')
  })
})
