import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Contribution from '../src/models/Contribution.js';
import Issue from '../src/models/Issue.js';
import { githubClient } from '../src/config/githubClient.js';
import { clearCache } from '../src/utils/cache.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { githubError } from './helpers/github.js';
import { connectGithub, mockProfileGithub } from './helpers/githubProfile.js';

vi.mock('../src/config/githubClient.js', () => ({ githubClient: { get: vi.fn() } }));

beforeAll(connectTestDB);
afterEach(async () => {
  await clearTestDB();
  clearCache();
  vi.clearAllMocks();
});
afterAll(closeTestDB);

describe('GET /api/dashboard', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/dashboard')).status).toBe(401);
  });

  it('returns empty stats and "not connected" for a brand-new user', async () => {
    const { agent } = await createAgent();
    const res = await agent.get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.data.tracking).toMatchObject({ total: 0, repositories: 0 });
    expect(res.body.data.github).toEqual({ connected: false });
  });

  it('combines tracker stats, PR stats and the activity series', async () => {
    mockProfileGithub({
      events: [
        { type: 'PullRequestEvent', created_at: new Date().toISOString(), repo: { name: 'acme/widgets' } },
        { type: 'IssueCommentEvent', created_at: new Date().toISOString(), repo: { name: 'alice/own' } }, // own repo
      ],
    });
    const { agent, user } = await createAgent();
    await connectGithub(user.id, 'alice');
    const issue = await Issue.create({
      githubId: 1,
      repoFullName: 'acme/widgets',
      number: 1,
      title: 'x',
      state: 'open',
      htmlUrl: 'https://github.com/acme/widgets/issues/1',
    });
    await Contribution.create({ user: user.id, issue: issue._id, status: 'working' });

    const { tracking, github } = (await agent.get('/api/dashboard')).body.data;

    expect(tracking).toMatchObject({ total: 1, repositories: 1, byStatus: { working: 1 } });
    expect(github).toMatchObject({ connected: true, available: true, pullRequests: { total: 4, merged: 2, open: 1, closed: 1 } });
    expect(github.activity.days).toHaveLength(91);
    expect(github.activity.days.at(-1).count).toBe(1);
    expect(github.activity.total).toBe(1);
  });

  it('still returns tracker stats when GitHub is rate limited', async () => {
    githubClient.get.mockRejectedValue(githubError(403, { 'x-ratelimit-remaining': '0' }));
    const { agent, user } = await createAgent();
    await connectGithub(user.id);

    const res = await agent.get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.github).toEqual({ connected: true, available: false });
    expect(res.body.data.tracking.total).toBe(0);
  });
});