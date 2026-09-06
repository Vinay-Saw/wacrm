import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  checkRateLimit,
  rateLimitResponse,
  __resetRateLimitForTests,
} from './rate-limit'

beforeEach(() => {
  __resetRateLimitForTests()
})

describe('checkRateLimit', () => {
  it('allows up to `limit` requests then blocks the next', () => {
    const opts = { limit: 3, windowMs: 60_000 }
    const r1 = checkRateLimit('user:1', opts)
    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = checkRateLimit('user:1', opts)
    expect(r2.success).toBe(true)
    expect(r2.remaining).toBe(1)

    const r3 = checkRateLimit('user:1', opts)
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)

    const r4 = checkRateLimit('user:1', opts)
    expect(r4.success).toBe(false)
    expect(r4.remaining).toBe(0)
  })

  it('resets after the window expires', () => {
    vi.useFakeTimers()
    const opts = { limit: 2, windowMs: 5_000 }

    checkRateLimit('user:2', opts)
    checkRateLimit('user:2', opts)
    // Should be blocked now
    expect(checkRateLimit('user:2', opts).success).toBe(false)

    // Advance past the window
    vi.advanceTimersByTime(5_001)

    // Fresh window — allowed again
    const r = checkRateLimit('user:2', opts)
    expect(r.success).toBe(true)
    expect(r.remaining).toBe(1)

    vi.useRealTimers()
  })

  it('keeps separate buckets for different keys', () => {
    const opts = { limit: 1, windowMs: 60_000 }

    expect(checkRateLimit('keyA', opts).success).toBe(true)
    expect(checkRateLimit('keyA', opts).success).toBe(false)

    // Different key should still be allowed
    expect(checkRateLimit('keyB', opts).success).toBe(true)
  })

  it('returns the correct `reset` timestamp', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    const opts = { limit: 10, windowMs: 60_000 }
    const r = checkRateLimit('user:3', opts)

    // Reset should be now + windowMs
    expect(r.reset).toBe(Date.now() + 60_000)

    vi.useRealTimers()
  })

  it('returns the configured `limit` in every result', () => {
    const opts = { limit: 42, windowMs: 60_000 }
    const r = checkRateLimit('user:4', opts)
    expect(r.limit).toBe(42)
  })
})

describe('rateLimitResponse', () => {
  it('returns a 429 response with correct headers', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    const result = {
      success: false,
      remaining: 0,
      reset: Date.now() + 30_000,
      limit: 60,
    }

    const response = rateLimitResponse(result)
    expect(response.status).toBe(429)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(response.headers.get('Retry-After')).toBe('30')

    vi.useRealTimers()
  })

  it('includes at least 1 second for Retry-After even if window just expired', () => {
    const result = {
      success: false,
      remaining: 0,
      reset: Date.now() - 100, // Already in the past
      limit: 10,
    }

    const response = rateLimitResponse(result)
    const retryAfter = Number(response.headers.get('Retry-After'))
    expect(retryAfter).toBeGreaterThanOrEqual(1)
  })
})
