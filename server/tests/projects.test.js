import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Project from '../src/models/Project.js';
import ProjectFollow from '../src/models/ProjectFollow.js';
import { clearCache } from '../src/utils/cache.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { mockProjectGithub, repoFixture } from './helpers/githubProject.js';

vi.mock('../src/config/githubClient.js', () => ({ githubClient: { get: vi.fn() } }));

beforeAll(connectTestDB);
beforeEach(() => mockProjectGithub());
afterEach(async () => {
  await clearTestDB();
  clearCache();
  vi.clearAllMocks();
});
afterAll(closeTestDB);

const maintainer = () => createAgent({ role: 'maintainer' });
const register = (agent, repo = 'acme/widgets') => agent.post('/api/projects').send({ repo });
const linkGithub = (userId, id, username = 'someone') =>
  User.updateOne({ _id: userId }, { $set: { 'github.id': id, 'github.username': username } });

async function makeProject(ownerId, over = {}) {
  const repoFullName = over.repoFullName ?? 'acme/widgets';
  return Project.create({
    owner: ownerId,
    repoFullName,
    repoKey: repoFullName.toLowerCase(),
    name: repoFullName.split('/')[1],
    ...over,
  });
}

describe('POST /api/projects', () => {
  it('requires authentication', async () => {
    expect((await request(app).post('/api/projects').send({ repo: 'acme/widgets' })).status).toBe(401);
  });

  it('is forbidden for contributors (backend role check)', async () => {
    const { agent } = await createAgent();
    expect((await register(agent)).status).toBe(403);
    expect(await Project.countDocuments()).toBe(0);
  });

  it('lists a repo using data fetched from GitHub', async () => {
    const { agent } = await maintainer();
    const res = await register(agent);

    expect(res.status).toBe(201);
    expect(res.body.data.project).toMatchObject({
      repoFullName: 'acme/widgets',
      githubOwner: 'acme',
      language: 'TypeScript',
      stars: 1234,
      forks: 56,
      license: 'MIT',
      topics: ['ui', 'widgets'],
      beginnerIssueCount: 3,
      helpWantedIssueCount: 2,
      contributorsCount: 87,
      verified: false,
      followersCount: 0,
    });
  });

  it('ignores anything but the repo name from the client', async () => {
    const { agent } = await maintainer();
    await agent.post('/api/projects').send({ repo: 'acme/widgets', verified: true, stars: 999999, name: 'HACKED' });

    const stored = await Project.findOne();
    expect(stored).toMatchObject({ verified: false, stars: 1234, name: 'widgets' });
  });

  it('marks the listing verified when you own the repository (matched by GitHub id)', async () => {
    mockProjectGithub({ repo: repoFixture({ owner: { id: 42, login: 'acme', type: 'User', avatar_url: 'x' } }) });
    const { agent, user } = await maintainer();
    await linkGithub(user.id, 42);

    expect((await register(agent)).body.data.project.verified).toBe(true);
  });

  it('marks the listing verified for public members of the owning organization', async () => {
    mockProjectGithub({ publicMembers: ['alice'] });
    const { agent, user } = await maintainer();
    await linkGithub(user.id, 7, 'alice');

    expect((await register(agent)).body.data.project.verified).toBe(true);
  });

  it('does not verify someone who is not a (public) member', async () => {
    const { agent, user } = await maintainer();
    await linkGithub(user.id, 7, 'mallory');

    expect((await register(agent)).body.data.project.verified).toBe(false);
  });

  it('returns 409 for a repository that is already listed (case-insensitive)', async () => {
    const one = await maintainer();
    const two = await maintainer();
    await register(one.agent);

    const res = await register(two.agent, 'ACME/Widgets');
    expect(res.status).toBe(409);
    expect(await Project.countDocuments()).toBe(1);
  });

  it('lets a verified owner take over an unverified listing (anti-squatting)', async () => {
    mockProjectGithub({ repo: repoFixture({ owner: { id: 42, login: 'acme', type: 'User', avatar_url: 'x' } }) });
    const squatter = await maintainer();
    const owner = await maintainer();
    await linkGithub(owner.user.id, 42);

    await register(squatter.agent);
    const res = await register(owner.agent);

    expect(res.status).toBe(201);
    expect(res.body.data.project.verified).toBe(true);
    expect(await Project.countDocuments()).toBe(1);
    expect(String((await Project.findOne()).owner)).toBe(owner.user.id);
  });

  it('never lets someone take over a verified listing', async () => {
    mockProjectGithub({ repo: repoFixture({ owner: { id: 42, login: 'acme', type: 'User', avatar_url: 'x' } }) });
    const owner = await maintainer();
    const other = await maintainer();
    await linkGithub(owner.user.id, 42);

    await register(owner.agent);
    expect((await register(other.agent)).status).toBe(409);
    expect(String((await Project.findOne()).owner)).toBe(owner.user.id);
  });

  it('rejects archived repositories', async () => {
    mockProjectGithub({ repo: repoFixture({ archived: true }) });
    const { agent } = await maintainer();
    expect((await register(agent)).status).toBe(400);
  });

  it('returns 404 when the repository does not exist on GitHub', async () => {
    mockProjectGithub({ repoMissing: true });
    const { agent } = await maintainer();
    expect((await register(agent)).status).toBe(404);
  });

  it('rejects an invalid repo name', async () => {
    const { agent } = await maintainer();
    expect((await register(agent, 'not-a-repo')).status).toBe(400);
  });

  it('limits how many projects one maintainer can list', async () => {
    const { agent, user } = await maintainer();
    for (let i = 0; i < 20; i++) await makeProject(user.id, { repoFullName: `o/r${i}` });

    expect((await register(agent)).status).toBe(403);
  });
});

describe('GET /api/projects', () => {
  async function seed() {
    const { agent, user } = await maintainer();
    const react = await makeProject(user.id, { repoFullName: 'facebook/react', stars: 500, language: 'JavaScript', topics: ['ui'] });
    const tools = await makeProject(user.id, { repoFullName: 'golang/tools', stars: 900, language: 'Go', topics: ['cli'] });
    const book = await makeProject(user.id, { repoFullName: 'rust-lang/book', stars: 100, language: 'Rust', beginnerIssueCount: 40 });
    return { agent, user, react, tools, book };
  }
  const names = (res) => res.body.data.items.map((p) => p.repoFullName);

  it('requires authentication', async () => {
    expect((await request(app).get('/api/projects')).status).toBe(401);
  });

  it('sorts by stars by default, and by beginner issues on request', async () => {
    const { agent } = await seed();
    expect(names(await agent.get('/api/projects'))).toEqual(['golang/tools', 'facebook/react', 'rust-lang/book']);
    expect(names(await agent.get('/api/projects?sort=beginner'))[0]).toBe('rust-lang/book');
  });

  it('filters by language and topic', async () => {
    const { agent } = await seed();
    expect(names(await agent.get('/api/projects?language=Go'))).toEqual(['golang/tools']);
    expect(names(await agent.get('/api/projects?topic=ui'))).toEqual(['facebook/react']);
  });

  it('searches by partial text, case-insensitively', async () => {
    const { agent } = await seed();
    expect(names(await agent.get('/api/projects?q=REA'))).toEqual(['facebook/react']);
  });

  it('treats search input as text, not as a regex pattern', async () => {
    const { agent } = await seed();
    const res = await agent.get('/api/projects?q=.*');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  it('paginates (12 per page)', async () => {
    const { agent, user } = await maintainer();
    for (let i = 0; i < 13; i++) await makeProject(user.id, { repoFullName: `o/p${i}`, stars: i });

    const first = await agent.get('/api/projects');
    const second = await agent.get('/api/projects?page=2');
    expect(first.body.data.items).toHaveLength(12);
    expect(first.body.data.pagination).toMatchObject({ totalCount: 13, totalPages: 2 });
    expect(second.body.data.items).toHaveLength(1);
  });

  it('shows follower counts, personal follow state and a "following" tab', async () => {
    const { agent, user, react } = await seed();
    const other = await createAgent();
    await ProjectFollow.create({ user: user.id, project: react.id });
    await ProjectFollow.create({ user: other.user.id, project: react.id });

    const all = await agent.get('/api/projects');
    const reactCard = all.body.data.items.find((p) => p.repoFullName === 'facebook/react');
    expect(reactCard).toMatchObject({ followersCount: 2, isFollowing: true });

    expect(names(await agent.get('/api/projects?following=true'))).toEqual(['facebook/react']);
    expect((await other.agent.get('/api/projects')).body.data.items.find((p) => p.repoFullName === 'golang/tools').isFollowing).toBe(false);
  });

  it.each([['sort=nope'], ['page=0'], ['topic=Bad Topic!']])('rejects invalid input: %s', async (qs) => {
    const { agent } = await maintainer();
    expect((await agent.get(`/api/projects?${qs}`)).status).toBe(400);
  });
});

describe('follow / unfollow', () => {
  const follow = (agent, id) => agent.post(`/api/projects/${id}/follow`);
  const unfollow = (agent, id) => agent.delete(`/api/projects/${id}/follow`);

  it('requires authentication', async () => {
    expect((await request(app).post('/api/projects/64b7f0f0f0f0f0f0f0f0f0f0/follow')).status).toBe(401);
  });

  it('is idempotent: following twice keeps one follow', async () => {
    const { agent, user } = await maintainer();
    const project = await makeProject(user.id);

    expect((await follow(agent, project.id)).status).toBe(200);
    const again = await follow(agent, project.id);
    expect(again.status).toBe(200);
    expect(again.body.data).toEqual({ following: true, followersCount: 1 });
    expect(await ProjectFollow.countDocuments()).toBe(1);
  });

  it('counts followers across users and unfollows idempotently', async () => {
    const one = await maintainer();
    const two = await createAgent();
    const project = await makeProject(one.user.id);

    await follow(one.agent, project.id);
    expect((await follow(two.agent, project.id)).body.data.followersCount).toBe(2);

    expect((await unfollow(two.agent, project.id)).body.data).toEqual({ following: false, followersCount: 1 });
    expect((await unfollow(two.agent, project.id)).status).toBe(200);
  });

  it('returns 404 for an unknown project and 400 for a malformed id', async () => {
    const { agent } = await createAgent();
    expect((await follow(agent, '64b7f0f0f0f0f0f0f0f0f0f0')).status).toBe(404);
    expect((await follow(agent, 'nope')).status).toBe(400);
  });
});

describe('GET /api/projects/:id', () => {
  const stale = (ownerId, over = {}) =>
    makeProject(ownerId, { stars: 1, beginnerIssueCount: 0, lastSyncedAt: new Date(0), ...over });

  it('requires authentication', async () => {
    expect((await request(app).get('/api/projects/64b7f0f0f0f0f0f0f0f0f0f0')).status).toBe(401);
  });

  it('returns languages, issue lists, activity and follow state', async () => {
    mockProjectGithub({
      events: [
        { id: '1', type: 'PushEvent', actor: { login: 'bob' }, created_at: '2026-03-01T00:00:00Z', payload: {} },
        {
          id: '2',
          type: 'PullRequestEvent',
          actor: { login: 'bob' },
          created_at: '2026-03-01T00:00:00Z',
          payload: { action: 'closed', pull_request: { number: 12, title: 'Add thing', merged: true } },
        },
      ],
    });
    const { agent, user } = await maintainer();
    const project = await stale(user.id);

    const res = await agent.get(`/api/projects/${project.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.languages).toEqual([
      { name: 'TypeScript', percent: 80 },
      { name: 'CSS', percent: 20 },
    ]);
    expect(res.body.data.beginnerIssues).toHaveLength(3);
    expect(res.body.data.helpWantedIssues).toHaveLength(2);
    expect(res.body.data.beginnerIssues[0]).toMatchObject({ difficulty: 'beginner', bookmarkId: null });
    expect(res.body.data.recentActivity).toEqual([
      expect.objectContaining({ kind: 'pr_merged', actor: 'bob', url: 'https://github.com/acme/widgets/pull/12' }),
    ]);
    expect(res.body.data.project).toMatchObject({ followersCount: 0, isFollowing: false, listedBy: { username: user.username } });
    expect(res.body.data.stale).toBe(false);
  });

  it('refreshes the stored snapshot from GitHub', async () => {
    const { agent, user } = await maintainer();
    const project = await stale(user.id);

    const res = await agent.get(`/api/projects/${project.id}`);
    expect(res.body.data.project).toMatchObject({ stars: 1234, beginnerIssueCount: 3, contributorsCount: 87 });

    expect(await Project.findById(project.id)).toMatchObject({ stars: 1234, beginnerIssueCount: 3, contributorsCount: 87 });
  });

  it('still returns the page when one GitHub section fails', async () => {
    mockProjectGithub({ eventsFail: true });
    const { agent, user } = await maintainer();
    const project = await stale(user.id);

    const res = await agent.get(`/api/projects/${project.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.recentActivity).toBeNull();
    expect(res.body.data.beginnerIssues).toHaveLength(3);
  });

  it('falls back to stored data and flags it when the repository fetch fails', async () => {
    mockProjectGithub({ repoMissing: true });
    const { agent, user } = await maintainer();
    const project = await stale(user.id);

    const res = await agent.get(`/api/projects/${project.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.project.stars).toBe(1); // stored value, not overwritten
    expect(res.body.data.stale).toBe(true);
  });

  it('reports who can manage the project', async () => {
    const owner = await maintainer();
    const other = await maintainer();
    const admin = await createAgent();
    await User.updateOne({ _id: admin.user.id }, { role: 'admin' });
    const project = await stale(owner.user.id);

    const canManage = async (agent) => (await agent.get(`/api/projects/${project.id}`)).body.data.canManage;
    expect(await canManage(owner.agent)).toBe(true);
    expect(await canManage(other.agent)).toBe(false);
    expect(await canManage(admin.agent)).toBe(true);
  });

  it('returns 404 for an unknown id and 400 for a malformed one', async () => {
    const { agent } = await createAgent();
    expect((await agent.get('/api/projects/64b7f0f0f0f0f0f0f0f0f0f0')).status).toBe(404);
    expect((await agent.get('/api/projects/nope')).status).toBe(400);
  });
});

describe('PATCH and DELETE /api/projects/:id', () => {
  it('lets the owner edit the summary and contributing link', async () => {
    const { agent, user } = await maintainer();
    const project = await makeProject(user.id);

    const res = await agent
      .patch(`/api/projects/${project.id}`)
      .send({ summary: '  Start with the docs  ', contributingUrl: 'https://example.com/contributing' });

    expect(res.status).toBe(200);
    expect(res.body.data.project).toMatchObject({ summary: 'Start with the docs', contributingUrl: 'https://example.com/contributing' });
  });

  it('forbids other maintainers but allows admins', async () => {
    const owner = await maintainer();
    const other = await maintainer();
    const admin = await createAgent();
    await User.updateOne({ _id: admin.user.id }, { role: 'admin' });
    const project = await makeProject(owner.user.id);

    expect((await other.agent.patch(`/api/projects/${project.id}`).send({ summary: 'x' })).status).toBe(403);
    expect((await admin.agent.patch(`/api/projects/${project.id}`).send({ summary: 'x' })).status).toBe(200);
  });

  it.each([[{ contributingUrl: 'javascript:alert(1)' }], [{ summary: 'x'.repeat(1001) }], [{}], [{ stars: 5 }]])(
    'rejects invalid input %j',
    async (body) => {
      const { agent, user } = await maintainer();
      const project = await makeProject(user.id);
      expect((await agent.patch(`/api/projects/${project.id}`).send(body)).status).toBe(400);
    },
  );

  it('cannot change GitHub-derived or trust fields through the body', async () => {
    const { agent, user } = await maintainer();
    const project = await makeProject(user.id, { stars: 10 });

    await agent.patch(`/api/projects/${project.id}`).send({ summary: 'hi', stars: 999999, verified: true, owner: 'x' });

    const stored = await Project.findById(project.id);
    expect(stored).toMatchObject({ stars: 10, verified: false });
    expect(String(stored.owner)).toBe(user.id);
  });

  it('deletes a project together with its follows (owner only)', async () => {
    const owner = await maintainer();
    const other = await maintainer();
    const project = await makeProject(owner.user.id);
    await ProjectFollow.create({ user: other.user.id, project: project.id });

    expect((await other.agent.delete(`/api/projects/${project.id}`)).status).toBe(403);
    expect((await owner.agent.delete(`/api/projects/${project.id}`)).status).toBe(200);
    expect(await Project.countDocuments()).toBe(0);
    expect(await ProjectFollow.countDocuments()).toBe(0);
  });
});