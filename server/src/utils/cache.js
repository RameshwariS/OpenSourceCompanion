// Cache-aside with three protections:
//   1. TTL            - fresh data is served without calling GitHub
//   2. Coalescing     - simultaneous requests for one key cause ONE upstream call (per process)
//   3. Stale-on-error - if GitHub is rate-limited/down, serve the last known value

const STALE_GRACE_MS = 60 * 60 * 1000; // keep expired entries 1h as an emergency fallback
const STALE_ELIGIBLE = new Set([429, 502, 503]); // never serve stale for 404/400

const MAX_ENTRIES = 1000;
const entries = new Map();
const inflight = new Map(); // key -> Promise

function pruneExpired() {
  const now = Date.now();
  for (const [k, v] of entries) {
    if (now > v.staleUntil) entries.delete(k);
  }
}

function setEntry(key, entry) {
  entries.delete(key); // re-insert so oldest keys come first for LRU eviction
  entries.set(key, entry);
  if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value);
}

export function clearCache() {
  entries.clear();
  inflight.clear();
}

export const forget = (key) => entries.delete(key);

/** @returns {Promise<{ data: any, stale: boolean }>} */
export async function cached(key, ttlSeconds, loader) {
  const entry = entries.get(key);
  if (entry && Date.now() < entry.expiresAt) return { data: entry.value, stale: false };

  // No await between this check and inflight.set() below, so two callers can't both start a load
  if (inflight.has(key)) return inflight.get(key);

  const run = async () => {
    try {
      const value = await loader();
      const now = Date.now();
      setEntry(key, {
        value,
        expiresAt: now + ttlSeconds * 1000,
        staleUntil: now + ttlSeconds * 1000 + STALE_GRACE_MS,
      });
      if (entries.size % 100 === 0) pruneExpired(); // periodic sweep to reclaim memory
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