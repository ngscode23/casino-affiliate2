import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import React from 'react'
import StatusBadge from '@ui/components/admin/StatusBadge'

describe('StatusBadge', () => {
  it('renders provided status text', () => {
    const { getByText } = render(<StatusBadge status="published" />)
    expect(getByText('published')).toBeTruthy()
  })
})


