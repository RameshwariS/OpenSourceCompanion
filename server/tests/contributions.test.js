import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Contribution from '../src/models/Contribution.js';
import { clearCache } from '../src/utils/cache.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { mockGithub, searchItem } from './helpers/github.js';

vi.mock('../src/config/githubClient.js', () => ({ githubClient: { get: vi.fn() } }));

beforeAll(connectTestDB);
beforeEach(() =>
  mockGithub({ items: [searchItem({ id: 101, number: 7 }), searchItem({ id: 102, number: 8, title: 'Second' })] }),
);
afterEach(async () => {
  await clearTestDB();
  clearCache();
  vi.clearAllMocks();
});
afterAll(closeTestDB);

const track = (agent, number, extra = {}) =>
  agent.post('/api/contributions').send({ repo: 'acme/widgets', number, ...extra });

describe('POST /api/contributions', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/contributions').send({ repo: 'acme/widgets', number: 7 });
    expect(res.status).toBe(401);
  });

  it('tracks an issue as "interested" by default', async () => {
    const { agent } = await createAgent();
    const res = await track(agent, 7);

    expect(res.status).toBe(201);
    expect(res.body.data.contribution).toMatchObject({ status: 'interested', notes: '' });
    expect(res.body.data.contribution.issue.number).toBe(7);
  });

  it('returns 409 when the issue is already tracked', async () => {
    const { agent } = await createAgent();
    await track(agent, 7);
    const res = await track(agent, 7);

    expect(res.status).toBe(409);
    expect(await Contribution.countDocuments()).toBe(1);
  });

  it('rejects an invalid status', async () => {
    const { agent } = await createAgent();
    const res = await track(agent, 7, { status: 'finished' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/contributions/:id', () => {
  it('updates status and notes', async () => {
    const { agent } = await createAgent();
    const { body } = await track(agent, 7);
    const id = body.data.contribution.id;

    const res = await agent.patch(`/api/contributions/${id}`).send({ status: 'working', notes: 'Started on the docs' });
    expect(res.status).toBe(200);
    expect(res.body.data.contribution).toMatchObject({ status: 'working', notes: 'Started on the docs' });
  });

  it('allows moving between any statuses (manual tracking)', async () => {
    const { agent } = await createAgent();
    const id = (await track(agent, 7, { status: 'merged' })).body.data.contribution.id;

    const res = await agent.patch(`/api/contributions/${id}`).send({ status: 'interested' });
    expect(res.status).toBe(200);
  });

  it('rejects an empty update and an invalid status', async () => {
    const { agent } = await createAgent();
    const id = (await track(agent, 7)).body.data.contribution.id;

    expect((await agent.patch(`/api/contributions/${id}`).send({})).status).toBe(400);
    expect((await agent.patch(`/api/contributions/${id}`).send({ status: 'nope' })).status).toBe(400);
  });

  it('returns 404 when updating someone else\'s contribution', async () => {
    const owner = await createAgent();
    const intruder = await createAgent();
    const id = (await track(owner.agent, 7)).body.data.contribution.id;

    const res = await intruder.agent.patch(`/api/contributions/${id}`).send({ status: 'merged' });
    expect(res.status).toBe(404);
    expect((await Contribution.findById(id)).status).toBe('interested');
  });

  it('cannot change the owner or issue through the body', async () => {
    const owner = await createAgent();
    const other = await createAgent();
    const id = (await track(owner.agent, 7)).body.data.contribution.id;

    await owner.agent.patch(`/api/contributions/${id}`).send({ status: 'planning', user: other.user.id });
    expect(String((await Contribution.findById(id)).user)).toBe(owner.user.id);
  });
});

describe('GET /api/contributions and /stats', () => {
  it('lists only the current user\'s contributions', async () => {
    const one = await createAgent();
    const two = await createAgent();
    await track(one.agent, 7);

    expect((await one.agent.get('/api/contributions')).body.data.contributions).toHaveLength(1);
    expect((await two.agent.get('/api/contributions')).body.data.contributions).toHaveLength(0);
  });

  it('returns counts per status, a total and distinct repositories', async () => {
    const { agent } = await createAgent();
    await track(agent, 7, { status: 'merged' });
    await track(agent, 8, { status: 'working' });

    const res = await agent.get('/api/contributions/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.stats).toMatchObject({
      total: 2,
      repositories: 1,
      byStatus: { merged: 1, working: 1, interested: 0, closed: 0 },
    });
  });
});

describe('DELETE /api/contributions/:id', () => {
  it('removes your contribution but not someone else\'s', async () => {
    const owner = await createAgent();
    const intruder = await createAgent();
    const id = (await track(owner.agent, 7)).body.data.contribution.id;

    expect((await intruder.agent.delete(`/api/contributions/${id}`)).status).toBe(404);
    expect((await owner.agent.delete(`/api/contributions/${id}`)).status).toBe(200);
    expect(await Contribution.countDocuments()).toBe(0);
  });
});

describe('tracking state in issue results', () => {
  it('shows the contribution status on search results', async () => {
    const { agent } = await createAgent();
    await track(agent, 7, { status: 'working' });

    const res = await agent.get('/api/issues');
    const issue = res.body.data.items.find((i) => i.number === 7);
    expect(issue.contribution.status).toBe('working');
  });
});