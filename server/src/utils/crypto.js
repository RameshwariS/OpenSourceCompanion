import crypto from 'node:crypto';
import { env } from '../config/env.js';

const key = Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'hex');

// AES-256-GCM = encryption + tamper detection. Output: iv.authTag.ciphertext (base64)
export function encrypt(plainText) {
  const iv = crypto.randomBytes(12); // fresh IV for every encryption
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString('base64')).join('.');
}

export function decrypt(payload) {
  const [iv, tag, encrypted] = payload.split('.').map((p) => Buffer.from(p, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}