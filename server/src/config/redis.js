import Redis from 'ioredis';
import { env } from './env.js';

let client = null;
let lastLog = 0;

export const getRedis = () => client;

/** Returns null when REDIS_URL is not set. Never throws: Redis is an optimisation, not a requirement. */
export function initRedis() {
  if (!env.REDIS_URL) return null;

  client = new Redis(env.REDIS_URL, {
    enableOfflineQueue: false, // fail fast while disconnected instead of queueing commands
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    retryStrategy: (attempt) => Math.min(attempt * 200, 5000), // keep reconnecting, up to every 5s
  });

  // An unhandled 'error' event would crash the process, so always listen (and don't flood the logs)
  client.on('error', (err) => {
    if (Date.now() - lastLog > 30_000) {
      lastLog = Date.now();
      console.warn('Redis error:', err.message);
    }
  });
  client.on('ready', () => console.log('Redis connected'));
  return client;
}

export async function closeRedis() {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
  client = null;
}