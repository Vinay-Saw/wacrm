import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkEnv,
  validateEnv,
  __resetEnvValidationForTests,
} from './env'

describe('env validation', () => {
  const validKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

  const completeEnv = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-12345',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-67890',
    ENCRYPTION_KEY: validKey,
    META_APP_SECRET: 'meta-secret-abcde',
  }

  beforeEach(() => {
    __resetEnvValidationForTests()
    vi.restoreAllMocks()
  })

  describe('checkEnv', () => {
    it('returns valid when all required variables are set and formatted correctly', () => {
      const res = checkEnv(completeEnv)
      expect(res.valid).toBe(true)
      expect(res.errors).toHaveLength(0)
    })

    it('flags missing NEXT_PUBLIC_SUPABASE_URL', () => {
      const res = checkEnv({ ...completeEnv, NEXT_PUBLIC_SUPABASE_URL: '' })
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('NEXT_PUBLIC_SUPABASE_URL'))).toBe(true)
    })

    it('flags missing NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
      const res = checkEnv({ ...completeEnv, NEXT_PUBLIC_SUPABASE_ANON_KEY: '   ' })
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'))).toBe(true)
    })

    it('flags missing SUPABASE_SERVICE_ROLE_KEY', () => {
      const res = checkEnv({ ...completeEnv, SUPABASE_SERVICE_ROLE_KEY: undefined })
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('SUPABASE_SERVICE_ROLE_KEY'))).toBe(true)
    })

    it('flags missing ENCRYPTION_KEY', () => {
      const res = checkEnv({ ...completeEnv, ENCRYPTION_KEY: '' })
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('ENCRYPTION_KEY is missing'))).toBe(true)
    })

    it('flags invalid length ENCRYPTION_KEY', () => {
      const res = checkEnv({ ...completeEnv, ENCRYPTION_KEY: 'short-key' })
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('ENCRYPTION_KEY is invalid'))).toBe(true)
    })

    it('flags non-hex ENCRYPTION_KEY', () => {
      const nonHexKey = validKey.slice(0, 63) + 'Z' // 'Z' is not hex
      const res = checkEnv({ ...completeEnv, ENCRYPTION_KEY: nonHexKey })
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('ENCRYPTION_KEY is invalid'))).toBe(true)
    })

    it('flags missing META_APP_SECRET', () => {
      const res = checkEnv({ ...completeEnv, META_APP_SECRET: '' })
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('META_APP_SECRET'))).toBe(true)
    })

    it('collects multiple errors at once', () => {
      const res = checkEnv({})
      expect(res.valid).toBe(false)
      expect(res.errors.length).toBe(5)
    })
  })

  describe('validateEnv', () => {
    it('succeeds and logs success when environment is valid', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      expect(() => validateEnv({ force: true, env: completeEnv, isServer: true })).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[env] ✓ All required environment variables present'),
      )
    })

    it('throws and logs formatted error block when variables are missing', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => validateEnv({ force: true, env: {}, isServer: true })).toThrowError(/Environment validation failed/)
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[env] ❌ MISSING OR INVALID REQUIRED ENVIRONMENT VARIABLES'),
      )
    })

    it('respects SKIP_ENV_VALIDATION flag', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() =>
        validateEnv({
          force: true,
          env: { SKIP_ENV_VALIDATION: '1' },
          isServer: true,
        }),
      ).not.toThrow()
      expect(errorSpy).not.toHaveBeenCalled()
    })

    it('skips validation when not running on server', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => validateEnv({ force: true, env: {}, isServer: false })).not.toThrow()
      expect(errorSpy).not.toHaveBeenCalled()
    })
  })
})
