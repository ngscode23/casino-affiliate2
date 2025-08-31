import { describe, it, expect, beforeEach } from 'vitest'
import { getConsent, setConsent, applyStoredConsentToDom, CONSENT_KEY } from '@/lib/consent'

describe('consent utils', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-analytics-consent')
    document.documentElement.removeAttribute('data-marketing-consent')
  })

  it('returns null when nothing stored', () => {
    expect(getConsent()).toBeNull()
  })

  it('sets and reads consent from storage and DOM', () => {
    setConsent({ analytics: true, marketing: false })
    expect(localStorage.getItem(CONSENT_KEY)).toContain('analytics')
    applyStoredConsentToDom()
    expect(document.documentElement.getAttribute('data-analytics-consent')).toBe('granted')
    expect(document.documentElement.getAttribute('data-marketing-consent')).toBe('denied')
  })
})

