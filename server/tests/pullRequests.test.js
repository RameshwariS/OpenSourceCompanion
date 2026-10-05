import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { clearCache } from '../src/utils/cache.js';
import { summarizeReviews } from '../src/services/pullRequest.service.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { connectGithub, mockProfileGithub, searchCallCount } from './helpers/githubProfile.js';

vi.mock('../src/config/githubClient.js', () => ({ githubClient: { get: vi.fn() } }));

beforeAll(connectTestDB);
afterEach(async () => {
  await clearTestDB();
  clearCache();
  vi.clearAllMocks();
});
afterAll(closeTestDB);

async function connectedAgent() {
  mockProfileGithub();
  const { agent, user } = await createAgent();
  await connectGithub(user.id);
  return agent;
}

describe('GET /api/pull-requests', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/pull-requests')).status).toBe(401);
  });

  it('asks the user to connect GitHub first', async () => {
    const { agent } = await createAgent();
    const res = await agent.get('/api/pull-requests');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('GITHUB_NOT_CONNECTED');
  });

  it('returns exact stats and the PR list', async () => {
    const agent = await connectedAgent();
    const res = await agent.get('/api/pull-requests');

    expect(res.status).toBe(200);
    expect(res.body.data.stats).toEqual({ total: 4, merged: 2, open: 1, closed: 1 });
    expect(res.body.data.items.map((p) => p.state).sort()).toEqual(['closed', 'merged', 'merged', 'open']);
  });

  it('adds review status for open PRs only', async () => {
    const agent = await connectedAgent();
    const res = await agent.get('/api/pull-requests');
    const byNumber = Object.fromEntries(res.body.data.items.map((p) => [p.number, p.reviewStatus]));

    expect(byNumber[1]).toBe('changes_requested'); // the open PR
    expect(byNumber[2]).toBeNull(); // merged PRs are not looked up
  });

  it('serves repeat requests from cache (3 searches, once)', async () => {
    const agent = await connectedAgent();
    await agent.get('/api/pull-requests');
    await agent.get('/api/pull-requests');
    await agent.get('/api/pull-requests/stats');
    expect(searchCallCount()).toBe(3);
  });

  it('refresh forces a re-fetch on the next read', async () => {
    const agent = await connectedAgent();
    await agent.get('/api/pull-requests');
    expect((await agent.post('/api/pull-requests/refresh')).status).toBe(200);
    await agent.get('/api/pull-requests');
    expect(searchCallCount()).toBe(6);
  });
});

describe('summarizeReviews', () => {
  const review = (login, state) => ({ user: { login }, state });

  it.each([
    [[], 'none'],
    [[review('a', 'COMMENTED')], 'none'],
    [[review('a', 'APPROVED')], 'approved'],
    [[review('a', 'APPROVED'), review('b', 'CHANGES_REQUESTED')], 'changes_requested'],
    // the same reviewer changing their mind: the latest decision wins
    [[review('a', 'CHANGES_REQUESTED'), review('a', 'APPROVED')], 'approved'],
    // a dismissed review no longer counts
    [[review('a', 'CHANGES_REQUESTED'), review('a', 'DISMISSED')], 'none'],
  ])('%j -> %s', (reviews, expected) => {
    expect(summarizeReviews(reviews)).toBe(expected);
  });
});