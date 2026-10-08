import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import OrgFollow from '../src/models/OrgFollow.js';
import { githubClient } from '../src/config/githubClient.js';
import { clearCache } from '../src/utils/cache.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { githubError } from './helpers/github.js';

vi.mock('../src/config/githubClient.js', () => ({ githubClient: { get: vi.fn() } }));

beforeAll(connectTestDB);
beforeEach(() => {
  // GitHub names are case-insensitive, and so is this mock
  githubClient.get.mockImplementation(async (url) => {
    if (url.toLowerCase() === '/orgs/acme') {
      return { data: { login: 'Acme', name: 'Acme Inc', avatar_url: 'https://avatars.githubusercontent.com/u/1' } };
    }
    throw githubError(404);
  });
});
afterEach(async () => {
  await clearTestDB();
  clearCache();
  vi.clearAllMocks();
});
afterAll(closeTestDB);

const follow = (agent, org = 'acme') => agent.post('/api/orgs/following').send({ org });

describe('POST /api/orgs/following', () => {
  it('requires authentication', async () => {
    expect((await request(app).post('/api/orgs/following').send({ org: 'acme' })).status).toBe(401);
  });

  it('follows an organization using GitHub\'s canonical name', async () => {
    const { agent, user } = await createAgent();
    const res = await follow(agent, 'ACME');

    expect(res.status).toBe(201);
    expect(res.body.data.follow).toMatchObject({ org: 'Acme' });
    const stored = await OrgFollow.findOne();
    expect(stored).toMatchObject({ org: 'Acme', orgKey: 'acme' });
    expect(String(stored.user)).toBe(user.id);
  });

  it('is idempotent and case-insensitive: following twice keeps one follow', async () => {
    const { agent } = await createAgent();

    expect((await follow(agent, 'acme')).status).toBe(201);
    const again = await follow(agent, 'ACME');

    expect(again.status).toBe(200);
    expect(await OrgFollow.countDocuments()).toBe(1);
  });

  it('returns 404 for an unknown organization (or a personal account) and stores nothing', async () => {
    const { agent } = await createAgent();
    const res = await follow(agent, 'torvalds');

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/organization/i);
    expect(await OrgFollow.countDocuments()).toBe(0);
  });

  it.each([['bad_name!'], [''], ['a'.repeat(40)]])('rejects the invalid name %j', async (org) => {
    const { agent } = await createAgent();
    expect((await follow(agent, org)).status).toBe(400);
  });

  it('limits how many organizations one user can follow', async () => {
    const { agent, user } = await createAgent();
    for (let i = 0; i < 20; i++) await OrgFollow.create({ user: user.id, org: `org${i}`, orgKey: `org${i}` });

    expect((await follow(agent)).status).toBe(400);
  });
});

describe('GET /api/orgs/following and DELETE /api/orgs/following/:org', () => {
  it('lists only your follows', async () => {
    const me = await createAgent();
    const other = await createAgent();
    await follow(me.agent);

    expect((await me.agent.get('/api/orgs/following')).body.data.follows).toHaveLength(1);
    expect((await other.agent.get('/api/orgs/following')).body.data.follows).toHaveLength(0);
  });

  it('unfollows (case-insensitively) and is idempotent', async () => {
    const { agent } = await createAgent();
    await follow(agent);

    expect((await agent.delete('/api/orgs/following/ACME')).status).toBe(200);
    expect(await OrgFollow.countDocuments()).toBe(0);
    expect((await agent.delete('/api/orgs/following/acme')).status).toBe(200);
  });

  it('cannot unfollow on behalf of someone else', async () => {
    const owner = await createAgent();
    const other = await createAgent();
    await follow(owner.agent);

    await other.agent.delete('/api/orgs/following/acme');
    expect(await OrgFollow.countDocuments()).toBe(1);
  });
});