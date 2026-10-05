import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { clearCache } from '../src/utils/cache.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { mockGithub, searchItem } from './helpers/github.js';

vi.mock('../src/config/githubClient.js', () => ({ githubClient: { get: vi.fn() } }));

const comment = { id: 1, user: { login: 'bob', avatar_url: 'x' }, body: 'I can take this!', created_at: '2026-02-02T00:00:00Z' };

beforeAll(connectTestDB);
afterEach(async () => {
  await clearTestDB();
  clearCache();
  vi.clearAllMocks();
});
afterAll(closeTestDB);

describe('GET /api/issues/:owner/:repo/:number', () => {
  it('requires authentication', async () => {
    mockGithub();
    const res = await request(app).get('/api/issues/acme/widgets/7');
    expect(res.status).toBe(401);
  });

  it('returns the issue with body, comments and difficulty', async () => {
    mockGithub({ comments: [comment] });
    const { agent } = await createAgent();
    const res = await agent.get('/api/issues/acme/widgets/7');

    expect(res.status).toBe(200);
    expect(res.body.data.issue).toMatchObject({
      number: 7,
      body: 'Please fix the typo.',
      difficulty: 'beginner',
      stars: 1234,
      bookmarkId: null,
      contribution: null,
    });
    expect(res.body.data.comments).toEqual([
      { id: 1, author: { login: 'bob', avatarUrl: 'x' }, body: 'I can take this!', createdAt: '2026-02-02T00:00:00Z' },
    ]);
  });

  it('returns 404 when GitHub does not know the issue', async () => {
    mockGithub();
    const { agent } = await createAgent();
    const res = await agent.get('/api/issues/acme/widgets/999');
    expect(res.status).toBe(404);
  });

  it('returns 404 for a pull request', async () => {
    mockGithub({ items: [searchItem({ pull_request: { url: 'x' } })] });
    const { agent } = await createAgent();
    const res = await agent.get('/api/issues/acme/widgets/7');
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed number or owner', async () => {
    mockGithub();
    const { agent } = await createAgent();
    expect((await agent.get('/api/issues/acme/widgets/abc')).status).toBe(400);
    expect((await agent.get('/api/issues/ac%20me/widgets/7')).status).toBe(400);
  });
});