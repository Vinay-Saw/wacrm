import { describe, it, expect } from 'vitest'
import {
  sanitizePhoneForMeta,
  normalizePhone,
  phonesMatch,
  isValidE164,
  phoneVariants,
  isRecipientNotAllowedError,
} from './phone-utils'

// ---------------------------------------------------------
// sanitizePhoneForMeta
// ---------------------------------------------------------
describe('sanitizePhoneForMeta', () => {
  it('strips + prefix', () => {
    expect(sanitizePhoneForMeta('+37063949836')).toBe('37063949836')
  })

  it('strips spaces', () => {
    expect(sanitizePhoneForMeta('+370 639 49836')).toBe('37063949836')
  })

  it('strips dashes', () => {
    expect(sanitizePhoneForMeta('+1-555-123-4567')).toBe('15551234567')
  })

  it('strips brackets', () => {
    expect(sanitizePhoneForMeta('+1 (555) 123-4567')).toBe('15551234567')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizePhoneForMeta('')).toBe('')
  })

  it('returns empty string for falsy input', () => {
    // @ts-expect-error testing runtime guard
    expect(sanitizePhoneForMeta(null)).toBe('')
    // @ts-expect-error testing runtime guard
    expect(sanitizePhoneForMeta(undefined)).toBe('')
  })

  it('handles already-clean digits', () => {
    expect(sanitizePhoneForMeta('37063949836')).toBe('37063949836')
  })
})

// ---------------------------------------------------------
// normalizePhone
// ---------------------------------------------------------
describe('normalizePhone', () => {
  it('strips all non-digit characters', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('919876543210')
  })

  it('returns empty for empty input', () => {
    expect(normalizePhone('')).toBe('')
  })
})

// ---------------------------------------------------------
// phonesMatch
// ---------------------------------------------------------
describe('phonesMatch', () => {
  it('matches identical numbers', () => {
    expect(phonesMatch('37063949836', '37063949836')).toBe(true)
  })

  it('matches after normalisation', () => {
    expect(phonesMatch('+370 639 498 36', '37063949836')).toBe(true)
  })

  it('matches with trunk prefix difference (last 8 digits)', () => {
    // With vs without trunk 0
    expect(phonesMatch('370063949836', '37063949836')).toBe(true)
  })

  it('does not match completely different numbers', () => {
    expect(phonesMatch('11111111111', '22222222222')).toBe(false)
  })

  it('does not match very short numbers (< 8 digits)', () => {
    expect(phonesMatch('12345', '12345')).toBe(true) // exact match
    expect(phonesMatch('1234567', '9234567')).toBe(false) // <8 digits, not exact
  })
})

// ---------------------------------------------------------
// isValidE164
// ---------------------------------------------------------
describe('isValidE164', () => {
  it('accepts valid E.164 with + prefix', () => {
    expect(isValidE164('+14155552671')).toBe(true)
  })

  it('accepts valid E.164 without + prefix', () => {
    expect(isValidE164('14155552671')).toBe(true)
  })

  it('accepts minimum length (7 digits)', () => {
    expect(isValidE164('+1234567')).toBe(true)
  })

  it('accepts maximum length (15 digits)', () => {
    expect(isValidE164('+123456789012345')).toBe(true)
  })

  it('rejects numbers starting with 0', () => {
    expect(isValidE164('+0123456789')).toBe(false)
  })

  it('rejects too-short numbers', () => {
    expect(isValidE164('+123456')).toBe(false)
  })

  it('rejects too-long numbers (16+ digits)', () => {
    expect(isValidE164('+1234567890123456')).toBe(false)
  })

  it('rejects letters mixed in', () => {
    expect(isValidE164('+1415abc2671')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidE164('')).toBe(false)
  })
})

// ---------------------------------------------------------
// phoneVariants
// ---------------------------------------------------------
describe('phoneVariants', () => {
  it('returns the original as the first variant', () => {
    const variants = phoneVariants('37063949836')
    expect(variants[0]).toBe('37063949836')
  })

  it('includes a variant with trunk 0 inserted', () => {
    const variants = phoneVariants('37063949836')
    // After 3-digit country code 370, a 0 inserted → 3700 63949836
    expect(variants).toContain('370063949836')
  })

  it('includes a variant with trunk 0 removed', () => {
    const variants = phoneVariants('370063949836')
    // After 3-digit cc 370, leading 0 removed → 37063949836
    expect(variants).toContain('37063949836')
  })

  it('returns empty array for empty input', () => {
    expect(phoneVariants('')).toEqual([])
  })

  it('returns deduplicated results', () => {
    const variants = phoneVariants('37063949836')
    const unique = [...new Set(variants)]
    expect(variants).toEqual(unique)
  })
})

// ---------------------------------------------------------
// isRecipientNotAllowedError
// ---------------------------------------------------------
describe('isRecipientNotAllowedError', () => {
  it('detects error code 131030', () => {
    expect(isRecipientNotAllowedError('Error 131030: recipient is not allowed')).toBe(true)
  })

  it('detects "not in allowed list" phrasing', () => {
    expect(isRecipientNotAllowedError('Recipient is not in allowed list')).toBe(true)
  })

  it('detects "not in the allowed list" phrasing', () => {
    expect(isRecipientNotAllowedError('Phone not in the allowed list')).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isRecipientNotAllowedError('Internal server error')).toBe(false)
  })
})
