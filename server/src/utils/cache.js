// Cache-aside with three protections:
//   1. TTL            - fresh data is served without calling GitHub
//   2. Coalescing     - simultaneous requests for one key cause ONE upstream call (per process)
//   3. Stale-on-error - if GitHub is rate-limited/down, serve the last known value
// WHERE entries are kept (memory or Redis) is decided by the store. See cacheStores.js.
import { createMemoryStore } from './cacheStores.js';

const STALE_GRACE_MS = 60 * 60 * 1000; // keep expired entries 1h as an emergency fallback
const STALE_ELIGIBLE = new Set([429, 502, 503]); // never serve stale for 404/400

let store = createMemoryStore();
const inflight = new Map(); // key -> Promise

export function setCacheStore(newStore) {
  store = newStore;
  inflight.clear();
}
export const getCacheStore = () => store;

export function clearCache() {
  inflight.clear();
  return store.clear();
}

export const forget = (key) => store.del(key);

/** @returns {Promise<{ data: any, stale: boolean }>} */
export async function cached(key, ttlSeconds, loader) {
  const entry = await store.get(key);
  if (entry && Date.now() < entry.expiresAt) return { data: entry.value, stale: false };

  // No await between this check and inflight.set() below, so two callers can't both start a load
  if (inflight.has(key)) return inflight.get(key);

  const run = async () => {
    try {
      const value = await loader();
      const now = Date.now();
      await store.set(key, {
        value,
        expiresAt: now + ttlSeconds * 1000,
        staleUntil: now + ttlSeconds * 1000 + STALE_GRACE_MS,
      });
      return { data: value, stale: false };
    } catch (err) {
      if (entry && STALE_ELIGIBLE.has(err.statusCode)) return { data: entry.value, stale: true };
      throw err;
    }
  };

  const promise = run().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}