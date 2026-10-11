import { describe, it, expect, vi, afterEach } from 'vitest';
import { cached, forget, setCacheStore } from '../src/utils/cache.js';
import { createMemoryStore, createRedisStore } from '../src/utils/cacheStores.js';

// A tiny stand-in for the ioredis client
function fakeRedis(status = 'ready') {
  const data = new Map();
  return {
    status,
    get: vi.fn(async (k) => data.get(k) ?? null),
    set: vi.fn(async (k, v) => {
      data.set(k, v);
      return 'OK';
    }),
    del: vi.fn(async (k) => {
      data.delete(k);
      return 1;
    }),
  };
}

afterEach(() => {
  setCacheStore(createMemoryStore());
  vi.restoreAllMocks();
});

describe('Redis cache store', () => {
  it('writes JSON under a prefix, with a TTL that includes the stale-grace period', async () => {
    const client = fakeRedis();
    setCacheStore(createRedisStore(() => client));

    await cached('k', 60, async () => ({ a: 1 }));

    const [key, json, mode, ttlMs] = client.set.mock.calls[0];
    expect(key).toBe('osc:cache:k');
    expect(JSON.parse(json).value).toEqual({ a: 1 });
    expect(mode).toBe('PX');
    expect(ttlMs).toBeGreaterThan(60_000);
  });

  it('shares entries between instances (the second one never calls the loader)', async () => {
    const client = fakeRedis();
    const loader = vi.fn(async () => 'x');

    setCacheStore(createRedisStore(() => client)); // "instance A"
    await cached('k', 60, loader);
    setCacheStore(createRedisStore(() => client)); // "instance B" with its own empty fallback
    const result = await cached('k', 60, loader);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: 'x', stale: false });
  });

  it('falls back to memory when Redis is not ready', async () => {
    const client = fakeRedis('reconnecting');
    const loader = vi.fn(async () => 'x');
    setCacheStore(createRedisStore(() => client));

    await cached('k', 60, loader);
    await cached('k', 60, loader);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(client.get).not.toHaveBeenCalled();
    expect(client.set).not.toHaveBeenCalled();
  });

  it('falls back to memory when a Redis command fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = fakeRedis();
    client.get.mockRejectedValue(new Error('boom'));
    client.set.mockRejectedValue(new Error('boom'));
    const loader = vi.fn(async () => 'x');
    setCacheStore(createRedisStore(() => client));

    await cached('k', 60, loader);
    await cached('k', 60, loader);

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('forget() removes the entry so the next call reloads', async () => {
    const client = fakeRedis();
    const loader = vi.fn(async () => 'x');
    setCacheStore(createRedisStore(() => client));

    await cached('k', 60, loader);
    await forget('k');
    await cached('k', 60, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });
});