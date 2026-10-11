import crypto from 'node:crypto';
import { getRedis } from '../config/redis.js';

// Deletes the lock only if we still own it (our token). Without this check, a job that ran
// longer than the TTL could delete a lock that another instance has since taken.
const RELEASE = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

/**
 * Runs `fn` only if no other instance holds the lock. Returns undefined when the lock is taken.
 * Without a working Redis it just runs `fn` (single instance). The notification dedupe keys
 * keep a double run harmless.
 */
export async function withLock(name, ttlSeconds, fn) {
  const client = getRedis();
  if (!client || client.status !== 'ready') return fn();

  const key = `osc:lock:${name}`;
  const token = crypto.randomUUID();

  let acquired;
  try {
    acquired = await client.set(key, token, 'EX', ttlSeconds, 'NX');
  } catch {
    return fn(); // Redis hiccup: better to run than to silently skip
  }
  if (acquired !== 'OK') return undefined;

  try {
    return await fn();
  } finally {
    try {
      await client.eval(RELEASE, 1, key, token);
    } catch {
      // the lock expires by itself after ttlSeconds
    }
  }
}