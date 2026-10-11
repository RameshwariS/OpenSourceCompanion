// A store only keeps entries: { value, expiresAt, staleUntil }. The cache logic lives in cache.js.

export function createMemoryStore({ maxEntries = 1000 } = {}) {
  const entries = new Map();
  return {
    name: 'memory',
    async get(key) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (Date.now() > entry.staleUntil) {
        entries.delete(key);
        return null;
      }
      return entry;
    },
    async set(key, entry) {
      entries.delete(key); // re-insert so the oldest keys come first for eviction
      entries.set(key, entry);
      if (entries.size > maxEntries) entries.delete(entries.keys().next().value);
    },
    async del(key) {
      entries.delete(key);
    },
    async clear() {
      entries.clear();
    },
  };
}

let lastWarn = 0;
function warn(err) {
  if (Date.now() - lastWarn > 30_000) {
    lastWarn = Date.now();
    console.warn('Redis cache problem, using the in-memory fallback:', err.message);
  }
}

/**
 * Redis store with an in-memory fallback. `getClient` is a function (not the client itself)
 * because the client is created at startup and replaced if Redis is re-initialised.
 */
export function createRedisStore(getClient, { prefix = 'osc:cache:' } = {}) {
  const fallback = createMemoryStore();
  const readyClient = () => {
    const client = getClient();
    return client?.status === 'ready' ? client : null;
  };

  async function viaRedis(op, fallbackOp) {
    const client = readyClient();
    if (!client) return fallbackOp();
    try {
      return await op(client);
    } catch (err) {
      warn(err);
      return fallbackOp();
    }
  }

  return {
    name: 'redis',
    get: (key) =>
      viaRedis(
        async (c) => {
          const raw = await c.get(prefix + key);
          return raw ? JSON.parse(raw) : null;
        },
        () => fallback.get(key),
      ),
    set: (key, entry) =>
      viaRedis(
        async (c) => {
          // Redis drops the entry itself once the stale-grace period is over
          const ttlMs = Math.max(1, entry.staleUntil - Date.now());
          await c.set(prefix + key, JSON.stringify(entry), 'PX', ttlMs);
        },
        () => fallback.set(key, entry),
      ),
    async del(key) {
      await fallback.del(key);
      await viaRedis(
        async (c) => {
          await c.del(prefix + key);
        },
        async () => {},
      );
    },
    async clear() {
      await fallback.clear();
      await viaRedis(
        async (c) => {
          const keys = [];
          for await (const batch of c.scanStream({ match: `${prefix}*`, count: 200 })) keys.push(...batch);
          if (keys.length > 0) await c.del(...keys);
        },
        async () => {},
      );
    },
  };
}