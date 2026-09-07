import { describe, it, expect, vi } from 'vitest';

// Mock the ENCRYPTION_KEY env var before importing the module.
// 64 hex chars = 32 bytes (AES-256 key length).
const TEST_KEY = 'a'.repeat(64);

vi.stubEnv('ENCRYPTION_KEY', TEST_KEY);

// Dynamic import so the env stub is in place first.
const { encrypt, decrypt, isLegacyFormat } = await import('./encryption');

describe('encrypt / decrypt (AES-256-GCM)', () => {
  it('roundtrips plaintext through encrypt → decrypt', () => {
    const plaintext = 'EAAGm0PX4ZCpsBO1GxMeta-token-value-here';
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('produces the iv:ciphertext:authTag format (3 colon-separated hex parts)', () => {
    const ciphertext = encrypt('hello');
    const parts = ciphertext.split(':');
    expect(parts).toHaveLength(3);
    // Each part should be a valid hex string
    for (const part of parts) {
      expect(part).toMatch(/^[0-9a-f]+$/i);
    }
    // IV should be 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24);
    // Auth tag should be 16 bytes = 32 hex chars
    expect(parts[2]).toHaveLength(32);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const a = encrypt('same-input');
    const b = encrypt('same-input');
    expect(a).not.toBe(b);
    // But both decrypt to the same value
    expect(decrypt(a)).toBe('same-input');
    expect(decrypt(b)).toBe('same-input');
  });

  it('throws on tampered ciphertext (flipped byte in auth tag)', () => {
    const ciphertext = encrypt('sensitive data');
    const parts = ciphertext.split(':');
    // Flip the first byte of the auth tag
    const tampered = parts[2][0] === 'a' ? 'b' : 'a';
    parts[2] = tampered + parts[2].slice(1);
    expect(() => decrypt(parts.join(':'))).toThrow();
  });

  it('throws on tampered ciphertext (flipped byte in ciphertext body)', () => {
    const ciphertext = encrypt('sensitive data');
    const parts = ciphertext.split(':');
    const tampered = parts[1][0] === 'a' ? 'b' : 'a';
    parts[1] = tampered + parts[1].slice(1);
    expect(() => decrypt(parts.join(':'))).toThrow();
  });

  it('throws on unrecognised format (0 colons)', () => {
    expect(() => decrypt('abcdef1234567890')).toThrow(/unrecognised format/);
  });

  it('throws on unrecognised format (4+ colons)', () => {
    expect(() => decrypt('aa:bb:cc:dd:ee')).toThrow(/unrecognised format/);
  });

  it('handles empty string plaintext', () => {
    const ciphertext = encrypt('');
    expect(decrypt(ciphertext)).toBe('');
  });

  it('handles unicode plaintext', () => {
    const plaintext = '🔑 token with émojis & ünïcödé';
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });
});

describe('isLegacyFormat', () => {
  it('returns true for a 2-part (CBC) string', () => {
    // Simulate old CBC format: iv:ciphertext
    expect(isLegacyFormat('aabbccdd:eeff0011')).toBe(true);
  });

  it('returns false for a 3-part (GCM) string', () => {
    const gcm = encrypt('test');
    expect(isLegacyFormat(gcm)).toBe(false);
  });

  it('returns false for a 1-part string', () => {
    expect(isLegacyFormat('nocolons')).toBe(false);
  });

  it('returns false for a 4-part string', () => {
    expect(isLegacyFormat('a:b:c:d')).toBe(false);
  });
});
