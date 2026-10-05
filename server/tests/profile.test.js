import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { clearCache } from '../src/utils/cache.js';
import { githubClient } from '../src/config/githubClient.js';
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

describe('PATCH /api/users/me', () => {
  it('requires authentication', async () => {
    expect((await request(app).patch('/api/users/me').send({ bio: 'x' })).status).toBe(401);
  });

  it('updates profile fields, trims, and de-duplicates skills case-insensitively', async () => {
    const { agent } = await createAgent();
    const res = await agent.patch('/api/users/me').send({
      bio: '  Learning Go  ',
      skills: ['Go', 'go', ' Docker '],
      location: 'Pune',
      portfolioUrl: 'https://example.com',
      linkedinUrl: 'https://www.linkedin.com/in/someone',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      bio: 'Learning Go',
      skills: ['Go', 'Docker'],
      location: 'Pune',
      portfolioUrl: 'https://example.com',
    });
  });

  it('lets users clear a URL with an empty string', async () => {
    const { agent } = await createAgent();
    await agent.patch('/api/users/me').send({ portfolioUrl: 'https://example.com' });
    const res = await agent.patch('/api/users/me').send({ portfolioUrl: '' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.portfolioUrl).toBe('');
  });

  it.each([
    [{ portfolioUrl: 'javascript:alert(1)' }],
    [{ portfolioUrl: 'not a url' }],
    [{ linkedinUrl: 'https://evil.com/linkedin.com' }],
    [{ skills: Array.from({ length: 16 }, (_, i) => `skill${i}`) }],
    [{ skills: ['ok', ''] }],
    [{ bio: 'x'.repeat(501) }],
    [{}],
  ])('rejects invalid input %j', async (body) => {
    const { agent } = await createAgent();
    expect((await agent.patch('/api/users/me').send(body)).status).toBe(400);
  });

  it('cannot change role, email or status through the body', async () => {
    const { agent, user } = await createAgent();
    const res = await agent.patch('/api/users/me').send({ bio: 'hi', role: 'admin', email: 'x@y.com', status: 'suspended' });

    expect(res.status).toBe(200);
    const stored = await User.findById(user.id);
    expect(stored).toMatchObject({ role: 'contributor', email: user.email, status: 'active' });
  });

  it('rejects a body that contains only forbidden fields', async () => {
    const { agent } = await createAgent();
    expect((await agent.patch('/api/users/me').send({ role: 'admin' })).status).toBe(400);
  });
});

describe('GET /api/users/:username', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/users/someone')).status).toBe(401);
  });

  it('returns 404 for unknown and suspended users', async () => {
    const viewer = await createAgent();
    const target = await createAgent();
    await User.updateOne({ _id: target.user.id }, { status: 'suspended' });

    expect((await viewer.agent.get('/api/users/nobody-here')).status).toBe(404);
    expect((await viewer.agent.get(`/api/users/${target.user.username}`)).status).toBe(404);
  });

  it('returns 400 for a malformed username', async () => {
    const { agent } = await createAgent();
    expect((await agent.get('/api/users/a')).status).toBe(400);
  });

  it('never leaks private fields', async () => {
    mockProfileGithub();
    const viewer = await createAgent();
    const target = await createAgent();
    await connectGithub(target.user.id);

    const res = await viewer.agent.get(`/api/users/${target.user.username}`);
    const raw = JSON.stringify(res.body);

    expect(res.status).toBe(200);
    expect(raw).not.toContain(target.user.email);
    expect(raw).not.toContain('passwordHash');
    expect(raw).not.toContain('accessTokenEnc');
    expect(res.body.data.profile.github).toBeUndefined(); // the raw github object (with the numeric id)
  });

  it('flags isSelf only on your own profile', async () => {
    const a = await createAgent();
    const b = await createAgent();
    expect((await a.agent.get(`/api/users/${a.user.username}`)).body.data.isSelf).toBe(true);
    expect((await a.agent.get(`/api/users/${b.user.username}`)).body.data.isSelf).toBe(false);
  });

  it('reports "not connected" when the user has no GitHub account', async () => {
    const { agent, user } = await createAgent();
    const res = await agent.get(`/api/users/${user.username}`);
    expect(res.body.data.github).toEqual({ connected: false });
  });

  it('combines PR stats, external-only repositories, streak and badges', async () => {
    mockProfileGithub({
      events: [
        { type: 'PullRequestEvent', created_at: new Date().toISOString(), repo: { name: 'acme/widgets' } },
        { type: 'IssueCommentEvent', created_at: new Date().toISOString(), repo: { name: 'alice/own' } }, // own repo
      ],
    });
    const { agent, user } = await createAgent();
    await connectGithub(user.id, 'alice');

    const { github } = (await agent.get(`/api/users/${user.username}`)).body.data;

    expect(github.pullRequests).toEqual({ total: 4, merged: 2, open: 1, closed: 1 });
    expect(github.repositories).toEqual(['acme/widgets']); // alice/own is excluded
    expect(github.streak).toEqual({ current: 1, longest: 1 });

    const earned = github.badges.filter((b) => b.earned).map((b) => b.id);
    expect(earned).toEqual(['first-contribution']); // 1 external merged PR, not 5
  });

  it('still returns the profile when GitHub is rate limited', async () => {
    githubClient.get.mockRejectedValue(githubError(403, { 'x-ratelimit-remaining': '0' }));
    const { agent, user } = await createAgent();
    await connectGithub(user.id);

    const res = await agent.get(`/api/users/${user.username}`);
    expect(res.status).toBe(200);
    expect(res.body.data.github).toEqual({ connected: true, available: false });
    expect(res.body.data.profile.username).toBe(user.username);
  });
});