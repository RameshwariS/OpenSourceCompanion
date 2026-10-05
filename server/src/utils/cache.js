// In-memory cache-aside with three protections:
//   1. TTL          - fresh data is served without calling GitHub
//   2. Coalescing   - 50 simultaneous requests for the same key cause ONE upstream call
//   3. Stale-on-error - if GitHub is rate-limited/down, serve the last known value
//
// Phase 11 swaps the Map for Redis. The `cached()` signature stays the same.

const MAX_ENTRIES = 1000;
const STALE_GRACE_MS = 60 * 60 * 1000; // keep expired entries 1h as an emergency fallback
const STALE_ELIGIBLE = new Set([429, 502, 503]); // never serve stale for 404/400

const store = new Map(); // key -> { value, expiresAt, staleUntil }
const inflight = new Map(); // key -> Promise

export function clearCache() {
  store.clear();
  inflight.clear();
}

function readEntry(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.staleUntil) {
    store.delete(key);
    return null;
  }
  return entry;
}

function writeEntry(key, value, ttlSeconds) {
  const now = Date.now();
  store.delete(key); // re-insert so the oldest keys come first for eviction
  store.set(key, {
    value,
    expiresAt: now + ttlSeconds * 1000,
    staleUntil: now + ttlSeconds * 1000 + STALE_GRACE_MS,
  });
  if (store.size > MAX_ENTRIES) store.delete(store.keys().next().value);
}

/** @returns {Promise<{ data: any, stale: boolean }>} */
export function cached(key, ttlSeconds, loader) {
  const entry = readEntry(key);
  if (entry && Date.now() < entry.expiresAt) {
    return Promise.resolve({ data: entry.value, stale: false });
  }
  if (inflight.has(key)) return inflight.get(key);

  const run = async () => {
    try {
      const value = await loader();
      writeEntry(key, value, ttlSeconds);
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

export function forget(key) {
  store.delete(key);
}