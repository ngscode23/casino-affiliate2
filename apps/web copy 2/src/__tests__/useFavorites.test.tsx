import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFavorites } from '@shared/lib/useFavorites'



describe('useFavorites', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes from empty localStorage', () => {
    const { result } = renderHook(() => useFavorites())
    expect(result.current.items).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('adds and removes items, persisting to localStorage', () => {
    const { result } = renderHook(() => useFavorites())

    act(() => {
      const ok = result.current.add('alpha')
      expect(ok).toBe(true)
    })
    expect(result.current.items).toContain('alpha')
    expect(JSON.parse(localStorage.getItem('fav:v1') || '[]')).toContain('alpha')

    act(() => {
      const next = result.current.toggle('beta')
      expect(next).toBe(true)
    })
    expect(result.current.items).toEqual(expect.arrayContaining(['alpha', 'beta']))
    expect(JSON.parse(localStorage.getItem('fav:v1') || '[]')).toEqual(expect.arrayContaining(['alpha', 'beta']))

    act(() => {
      const next = result.current.toggle('alpha')
      expect(next).toBe(false)
    })
    expect(result.current.items).not.toContain('alpha')
    expect(JSON.parse(localStorage.getItem('fav:v1') || '[]')).not.toContain('alpha')
  })

  it('clear() wipes the list and storage', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => void result.current.add('x'))
    act(() => void result.current.add('y'))
    expect(result.current.items).toEqual(expect.arrayContaining(['x', 'y']))

    act(() => result.current.clear())
    expect(result.current.items).toEqual([])
    expect(localStorage.getItem('fav:v1')).toBe('[]')
    expect(JSON.parse(localStorage.getItem('fav:v1') || '[]')).toEqual([])
  })
})



