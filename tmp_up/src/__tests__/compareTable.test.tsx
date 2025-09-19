import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CompareTable from '@/components/compare/CompareTable'
import { CompareProvider } from '@/ctx/CompareContext'
import { I18nProvider } from '@/lib/i18n'

const offers = [
  { slug: 'a', name: 'A', license: 'MGA', rating: 3.2, payout: '', methods: [] },
  { slug: 'b', name: 'B', license: 'UKGC', rating: 4.5, payout: '', methods: [] },
  { slug: 'c', name: 'C', license: 'Other', rating: 2.1, payout: '', methods: [] },
] as any

describe('CompareTable', () => {
  it('sorts by rating desc by default when toggled', () => {
    const onSort = vi.fn()
    render(
      <MemoryRouter>
        <I18nProvider>
          <CompareProvider>
            <CompareTable offers={offers} sortKey="rating" sortDir="desc" onSortChange={onSort} />
          </CompareProvider>
        </I18nProvider>
      </MemoryRouter>
    )
    const links = screen.getAllByRole('link')
    const names = links.map(a => (a.textContent || '').trim()).filter(t => ['A','B','C'].includes(t))
    const idxB = names.indexOf('B')
    const idxA = names.indexOf('A')
    const idxC = names.indexOf('C')
    expect(idxB).toBeGreaterThan(-1)
    expect(idxA).toBeGreaterThan(-1)
    expect(idxC).toBeGreaterThan(-1)
    expect(idxB).toBeLessThan(idxA)
    expect(idxB).toBeLessThan(idxC)
  })
})
