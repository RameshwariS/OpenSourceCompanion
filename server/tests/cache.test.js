import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cached, clearCache } from '../src/utils/cache.js';
import { ApiError } from '../src/utils/ApiError.js';

beforeEach(() => {
  clearCache();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('cached()', () => {
  it('calls the loader once while the entry is fresh', async () => {
    const loader = vi.fn().mockResolvedValue('a');
    await cached('k', 60, loader);
    const second = await cached('k', 60, loader);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(second).toEqual({ data: 'a', stale: false });
  });

  it('reloads after the TTL expires', async () => {
    const loader = vi.fn().mockResolvedValueOnce('a').mockResolvedValueOnce('b');
    await cached('k', 60, loader);
    vi.advanceTimersByTime(61_000);

    expect((await cached('k', 60, loader)).data).toBe('b');
  });

  it('coalesces concurrent requests into one upstream call', async () => {
    const loader = vi.fn(async () => 'x');
    await Promise.all([cached('k', 60, loader), cached('k', 60, loader), cached('k', 60, loader)]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('serves the stale value when GitHub is rate limited', async () => {
    await cached('k', 60, async () => 'old');
    vi.advanceTimersByTime(61_000);

    const result = await cached('k', 60, async () => {
      throw new ApiError(429, 'limited');
    });
    expect(result).toEqual({ data: 'old', stale: true });
  });

  it('does NOT serve stale data for a 404', async () => {
    await cached('k', 60, async () => 'old');
    vi.advanceTimersByTime(61_000);

    await expect(
      cached('k', 60, async () => {
        throw new ApiError(404, 'gone');
      }),
    ).rejects.toThrow('gone');
  });

  it('does not cache failures', async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(502, 'down'))
      .mockResolvedValueOnce('ok');

    await expect(cached('k', 60, loader)).rejects.toThrow();
    expect((await cached('k', 60, loader)).data).toBe('ok');
  });
});