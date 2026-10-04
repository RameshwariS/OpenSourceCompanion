import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../src/utils/crypto.js';

describe('token encryption', () => {
  it('round-trips a value', () => {
    expect(decrypt(encrypt('gho_secret_token'))).toBe('gho_secret_token');
  });

  it('produces different ciphertext each time (random IV)', () => {
    expect(encrypt('same')).not.toBe(encrypt('same'));
  });

  it('detects tampering', () => {
    const [iv, tag, data] = encrypt('gho_secret_token').split('.');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 1;
    expect(() => decrypt([iv, tag, flipped.toString('base64')].join('.'))).toThrow();
  });
});