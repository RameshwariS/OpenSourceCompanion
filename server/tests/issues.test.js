import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { clearCache } from '../src/utils/cache.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { mockGithub, searchItem, searchCalls, githubError } from './helpers/github.js';
import { githubClient } from '../src/config/githubClient.js';

vi.mock('../src/config/githubClient.js', () => ({ githubClient: { get: vi.fn() } }));

beforeAll(connectTestDB);
beforeEach(() => mockGithub());
afterEach(async () => {
  await clearTestDB();
  clearCache();
  vi.clearAllMocks();
});
afterAll(closeTestDB);

describe('GET /api/issues', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/issues');
    expect(res.status).toBe(401);
  });

  it('returns issues enriched with repo stars/language and an estimated difficulty', async () => {
    const { agent } = await createAgent();
    const res = await agent.get('/api/issues');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const [issue] = res.body.data.items;
    expect(issue).toMatchObject({
      githubId: 101,
      number: 7,
      repoFullName: 'acme/widgets',
      owner: 'acme',
      language: 'TypeScript',
      stars: 1234,
      difficulty: 'beginner',
      commentsCount: 3,
    });
    expect(issue.body).toBeUndefined(); // list responses omit the body
    expect(res.body.data.pagination).toMatchObject({ page: 1, perPage: 20, totalPages: 1 });
  });

  it('translates filters into GitHub search syntax', async () => {
    const { agent } = await createAgent();
    await agent.get('/api/issues').query({
      language: 'C++',
      difficulty: 'beginner',
      labels: 'bug,docs',
      repo: 'acme/widgets',
      helpWanted: 'true',
    });

    const q = searchCalls()[0][1].params.q;
    expect(q).toContain('is:issue is:open');
    expect(q).toContain('language:"C++"');
    expect(q).toContain('repo:acme/widgets');
    expect(q).toContain('label:"good first issue","good-first-issue"');
    expect(q).toContain('label:"help wanted"');
    expect(q).toContain('label:"bug"');
    expect(q).toContain('label:"docs"');
  });

  it('caps pagination at GitHub\'s 1000-result limit', async () => {
    mockGithub({ total: 2500 });
    const { agent } = await createAgent();
    const res = await agent.get('/api/issues');

    expect(res.body.data.pagination).toMatchObject({ totalCount: 2500, totalAvailable: 1000, totalPages: 50 });
  });

  it('serves a repeated search from cache without calling GitHub again', async () => {
    const { agent } = await createAgent();
    await agent.get('/api/issues?language=Go');
    await agent.get('/api/issues?language=Go');
    expect(searchCalls()).toHaveLength(1);
  });

  it('applies the minStars post-filter', async () => {
    const { agent } = await createAgent();
    const high = await agent.get('/api/issues?minStars=5000');
    const low = await agent.get('/api/issues?minStars=1000');

    expect(high.body.data.items).toHaveLength(0);
    expect(low.body.data.items).toHaveLength(1);
  });

  it('applies the advanced post-filter', async () => {
    const { agent } = await createAgent();
    const res = await agent.get('/api/issues?difficulty=advanced');
    expect(res.body.data.items).toHaveLength(0); // our only issue is "beginner"
  });

  it('drops pull requests that sneak into results', async () => {
    mockGithub({ items: [searchItem({ pull_request: { url: 'x' } })] });
    const { agent } = await createAgent();
    const res = await agent.get('/api/issues');
    expect(res.body.data.items).toHaveLength(0);
  });

  it('maps a GitHub rate limit to 429', async () => {
    githubClient.get.mockRejectedValue(githubError(403, { 'x-ratelimit-remaining': '0' }));
    const { agent } = await createAgent();
    const res = await agent.get('/api/issues');

    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/rate limit/i);
  });

  it.each([
    ['page=0'],
    ['page=51'],
    ['repo=not-a-repo'],
    ['labels=a,b,c,d'],
    ['difficulty=expert'],
    ['sort=stars'],
  ])('rejects invalid input: %s', async (qs) => {
    const { agent } = await createAgent();
    const res = await agent.get(`/api/issues?${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});