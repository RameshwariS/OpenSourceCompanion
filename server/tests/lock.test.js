import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRedis } from '../src/config/redis.js';
import { withLock } from '../src/utils/lock.js';

vi.mock('../src/config/redis.js', () => ({ getRedis: vi.fn() }));

const fakeClient = (over = {}) => ({
  status: 'ready',
  set: vi.fn().mockResolvedValue('OK'),
  eval: vi.fn().mockResolvedValue(1),
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('withLock', () => {
  it('just runs the function when Redis is not configured', async () => {
    getRedis.mockReturnValue(null);
    const fn = vi.fn(async () => 'done');
    expect(await withLock('job', 60, fn)).toBe('done');
  });

  it('just runs the function when Redis is not ready', async () => {
    getRedis.mockReturnValue(fakeClient({ status: 'connecting' }));
    const fn = vi.fn(async () => 'done');
    expect(await withLock('job', 60, fn)).toBe('done');
  });

  it('skips the function when another instance holds the lock', async () => {
    getRedis.mockReturnValue(fakeClient({ set: vi.fn().mockResolvedValue(null) }));
    const fn = vi.fn();

    expect(await withLock('job', 60, fn)).toBeUndefined();
    expect(fn).not.toHaveBeenCalled();
  });

  it('takes the lock with NX and an expiry, and releases it with the same token', async () => {
    const client = fakeClient();
    getRedis.mockReturnValue(client);

    await withLock('job', 60, async () => {});

    expect(client.set).toHaveBeenCalledWith('osc:lock:job', expect.any(String), 'EX', 60, 'NX');
    const token = client.set.mock.calls[0][1];
    const [, keyCount, key, releasedToken] = client.eval.mock.calls[0];
    expect([keyCount, key, releasedToken]).toEqual([1, 'osc:lock:job', token]);
  });

  it('releases the lock even when the function throws', async () => {
    const client = fakeClient();
    getRedis.mockReturnValue(client);

    await expect(
      withLock('job', 60, async () => {
        throw new Error('job failed');
      }),
    ).rejects.toThrow('job failed');
    expect(client.eval).toHaveBeenCalledTimes(1);
  });

  it('runs anyway if Redis fails while taking the lock', async () => {
    getRedis.mockReturnValue(fakeClient({ set: vi.fn().mockRejectedValue(new Error('down')) }));
    const fn = vi.fn(async () => 'done');
    expect(await withLock('job', 60, fn)).toBe('done');
  });
});