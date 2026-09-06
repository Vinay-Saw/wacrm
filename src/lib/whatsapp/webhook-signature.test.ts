import { describe, it, expect, vi } from 'vitest'
import crypto from 'node:crypto'

// We need to test verifyMetaWebhookSignature, but it reads process.env.META_APP_SECRET.
// Stub it before importing.

describe('verifyMetaWebhookSignature', () => {
  const TEST_SECRET = 'test_app_secret_12345'

  function computeSignature(body: string, secret: string): string {
    return (
      'sha256=' +
      crypto.createHmac('sha256', secret).update(body).digest('hex')
    )
  }

  it('returns true for a valid signature', async () => {
    vi.stubEnv('META_APP_SECRET', TEST_SECRET)
    // Re-import to pick up the stub
    const { verifyMetaWebhookSignature } = await import('./webhook-signature')

    const body = '{"object":"whatsapp_business_account","entry":[]}'
    const sig = computeSignature(body, TEST_SECRET)

    expect(verifyMetaWebhookSignature(body, sig)).toBe(true)
  })

  it('returns false for a tampered body', async () => {
    vi.stubEnv('META_APP_SECRET', TEST_SECRET)
    const { verifyMetaWebhookSignature } = await import('./webhook-signature')

    const body = '{"object":"whatsapp_business_account","entry":[]}'
    const sig = computeSignature(body, TEST_SECRET)

    // Tamper with the body
    expect(verifyMetaWebhookSignature(body + 'x', sig)).toBe(false)
  })

  it('returns false when META_APP_SECRET is not set', async () => {
    vi.stubEnv('META_APP_SECRET', '')
    // Force a fresh import by resetting the module registry
    vi.resetModules()
    const { verifyMetaWebhookSignature } = await import('./webhook-signature')

    const body = 'test'
    const sig = computeSignature(body, 'anything')
    expect(verifyMetaWebhookSignature(body, sig)).toBe(false)
  })

  it('returns false when signature header is null', async () => {
    vi.stubEnv('META_APP_SECRET', TEST_SECRET)
    vi.resetModules()
    const { verifyMetaWebhookSignature } = await import('./webhook-signature')

    expect(verifyMetaWebhookSignature('test', null)).toBe(false)
  })

  it('returns false when signature header lacks sha256= prefix', async () => {
    vi.stubEnv('META_APP_SECRET', TEST_SECRET)
    vi.resetModules()
    const { verifyMetaWebhookSignature } = await import('./webhook-signature')

    const body = 'test'
    const rawHex = crypto
      .createHmac('sha256', TEST_SECRET)
      .update(body)
      .digest('hex')

    // Missing prefix
    expect(verifyMetaWebhookSignature(body, rawHex)).toBe(false)
  })

  it('returns false when signature length mismatches (timing-safe guard)', async () => {
    vi.stubEnv('META_APP_SECRET', TEST_SECRET)
    vi.resetModules()
    const { verifyMetaWebhookSignature } = await import('./webhook-signature')

    expect(verifyMetaWebhookSignature('test', 'sha256=short')).toBe(false)
  })
})
