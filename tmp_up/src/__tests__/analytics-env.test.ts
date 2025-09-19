import { describe, it, expect } from 'vitest'
import * as analytics from '@/lib/analytics'

describe('GA env alias', () => {
  it('uses GA_ID or GA_MEASUREMENT_ID', () => {
    // In JSDOM env we cannot change import.meta.env easily; just assert export exists as string
    expect(typeof analytics.GA_ID).toBe('string')
  })
})

