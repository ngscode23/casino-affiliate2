import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import DataTable, { type Column } from '@/components/admin/DataTable'

type Row = { id: string; title: string; price: number }

describe('DataTable sorting', () => {
  it('calls onSortChange when clicking sortable header', () => {
    const rows: Row[] = [
      { id: '1', title: 'A', price: 10 },
      { id: '2', title: 'B', price: 20 },
    ]
    const cols: Column<Row>[] = [
      { key: 'title', header: 'Title', sortable: true },
      { key: 'price', header: 'Price', sortable: true },
    ]
    const onSortChange = vi.fn()
    const { getByText } = render(
      <DataTable
        rows={rows}
        columns={cols}
        sortKey={'title'}
        sortDir={'asc'}
        onSortChange={onSortChange}
        page={1}
        pageSize={10}
        total={2}
        onPageChange={() => {}}
        rowId={(r) => r.id}
      />
    )
    fireEvent.click(getByText('Title'))
    expect(onSortChange).toHaveBeenCalledWith('title', 'desc')
  })
})

