import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CURRENCY,
  CURRENCIES,
  formatCurrency,
  formatCurrencyShort,
  formatCompactNumber,
} from './currency'

// ---------------------------------------------------------
// Constants
// ---------------------------------------------------------
describe('DEFAULT_CURRENCY', () => {
  it('is USD', () => {
    expect(DEFAULT_CURRENCY).toBe('USD')
  })
})

describe('CURRENCIES', () => {
  it('has at least 10 options', () => {
    expect(CURRENCIES.length).toBeGreaterThanOrEqual(10)
  })

  it('every entry has code, label, and symbol', () => {
    for (const c of CURRENCIES) {
      expect(c.code).toBeTruthy()
      expect(c.label).toBeTruthy()
      expect(c.symbol).toBeTruthy()
    }
  })

  it('includes USD as the first option', () => {
    expect(CURRENCIES[0].code).toBe('USD')
  })
})

// ---------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------
describe('formatCurrency', () => {
  it('formats a USD amount', () => {
    const result = formatCurrency(1234, 'USD')
    // Should contain $, 1,234 or 1234 (locale-dependent), no decimal
    expect(result).toContain('1')
    expect(result).toContain('234')
  })

  it('formats zero', () => {
    const result = formatCurrency(0, 'USD')
    expect(result).toContain('0')
  })

  it('defaults to USD when currency is empty', () => {
    const result = formatCurrency(100, '')
    expect(result).toContain('100')
  })

  it('defaults to USD when currency is undefined', () => {
    const result = formatCurrency(100)
    expect(result).toContain('100')
  })

  it('handles invalid currency codes without throwing', () => {
    // Should fall back to "CODE amount" format
    const result = formatCurrency(500, 'INVALID')
    expect(result).toContain('500')
    expect(result).toContain('INVALID')
  })

  it('handles NaN value gracefully', () => {
    const result = formatCurrency(NaN, 'USD')
    expect(result).toContain('0')
  })

  it('handles negative values', () => {
    const result = formatCurrency(-500, 'USD')
    expect(result).toContain('500')
  })
})

// ---------------------------------------------------------
// formatCompactNumber
// ---------------------------------------------------------
describe('formatCompactNumber', () => {
  it('formats millions as M', () => {
    expect(formatCompactNumber(1_200_000)).toBe('1.2M')
  })

  it('formats thousands as k', () => {
    expect(formatCompactNumber(1_500)).toBe('1.5k')
  })

  it('formats exact thousand', () => {
    expect(formatCompactNumber(1_000)).toBe('1.0k')
  })

  it('formats sub-thousand as plain integer', () => {
    expect(formatCompactNumber(900)).toBe('900')
  })

  it('formats zero', () => {
    expect(formatCompactNumber(0)).toBe('0')
  })

  it('handles NaN input', () => {
    expect(formatCompactNumber(NaN)).toBe('0')
  })
})

// ---------------------------------------------------------
// formatCurrencyShort
// ---------------------------------------------------------
describe('formatCurrencyShort', () => {
  it('uses the symbol for known currencies', () => {
    const result = formatCurrencyShort(1_500, 'USD')
    expect(result).toBe('$1.5k')
  })

  it('uses the symbol for INR', () => {
    const result = formatCurrencyShort(1_200_000, 'INR')
    expect(result).toBe('₹1.2M')
  })

  it('falls back to code prefix for unknown currencies', () => {
    const result = formatCurrencyShort(500, 'XYZ')
    expect(result).toBe('XYZ 500')
  })

  it('defaults to USD when currency is omitted', () => {
    const result = formatCurrencyShort(2_000)
    expect(result).toBe('$2.0k')
  })
})
