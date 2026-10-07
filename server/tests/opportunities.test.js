import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Application from '../src/models/Application.js';
import Opportunity from '../src/models/Opportunity.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { makeApplication, makeOpportunity, makeProject } from './helpers/factories.js';

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

const maintainer = () => createAgent({ role: 'maintainer' });
const UNKNOWN_ID = '64b7f0f0f0f0f0f0f0f0f0f0';

const payload = (project, over = {}) => ({
  project,
  title: 'Improve the docs',
  description: 'Help us improve the getting started guide for new users.',
  skills: ['React', 'Markdown'],
  difficulty: 'beginner',
  expectedHoursMin: 2,
  expectedHoursMax: 5,
  ...over,
});

describe('POST /api/opportunities', () => {
  it('requires authentication', async () => {
    expect((await request(app).post('/api/opportunities').send(payload(UNKNOWN_ID))).status).toBe(401);
  });

  it('is forbidden for contributors (backend role check)', async () => {
    const owner = await maintainer();
    const project = await makeProject(owner.user.id);
    const { agent } = await createAgent();

    expect((await agent.post('/api/opportunities').send(payload(project.id))).status).toBe(403);
    expect(await Opportunity.countDocuments()).toBe(0);
  });

  it('is forbidden for a maintainer who does not own the project', async () => {
    const owner = await maintainer();
    const other = await maintainer();
    const project = await makeProject(owner.user.id);

    expect((await other.agent.post('/api/opportunities').send(payload(project.id))).status).toBe(403);
  });

  it('lets the project owner post an opportunity', async () => {
    const { agent, user } = await maintainer();
    const project = await makeProject(user.id);

    const res = await agent.post('/api/opportunities').send(payload(project.id));

    expect(res.status).toBe(201);
    expect(res.body.data.opportunity).toMatchObject({
      title: 'Improve the docs',
      difficulty: 'beginner',
      status: 'open',
      skills: ['React', 'Markdown'],
      expectedHours: { min: 2, max: 5 },
      canManage: true,
      project: { repoFullName: 'acme/widgets' },
    });
  });

  it('takes the author from the session and the status from the server', async () => {
    const { agent, user } = await maintainer();
    const other = await createAgent();
    const project = await makeProject(user.id);

    await agent.post('/api/opportunities').send(payload(project.id, { createdBy: other.user.id, status: 'closed' }));

    const stored = await Opportunity.findOne();
    expect(String(stored.createdBy)).toBe(user.id);
    expect(stored.status).toBe('open');
  });

  it('lets an admin post on any project', async () => {
    const owner = await maintainer();
    const admin = await createAgent();
    await User.updateOne({ _id: admin.user.id }, { role: 'admin' });
    const project = await makeProject(owner.user.id);

    expect((await admin.agent.post('/api/opportunities').send(payload(project.id))).status).toBe(201);
  });

  it('returns 404 for an unknown project', async () => {
    const { agent } = await maintainer();
    expect((await agent.post('/api/opportunities').send(payload(UNKNOWN_ID))).status).toBe(404);
  });

  it('limits open opportunities per project', async () => {
    const { agent, user } = await maintainer();
    const project = await makeProject(user.id);
    for (let i = 0; i < 25; i++) await makeOpportunity(project.id, user.id);

    expect((await agent.post('/api/opportunities').send(payload(project.id))).status).toBe(400);
  });

  it.each([
    ['a short title', { title: 'abc' }],
    ['a short description', { description: 'too short' }],
    ['an unknown difficulty', { difficulty: 'expert' }],
    ['min hours above max hours', { expectedHoursMin: 6, expectedHoursMax: 2 }],
    ['too many skills', { skills: Array.from({ length: 11 }, (_, i) => `skill${i}`) }],
    ['a malformed project id', { project: 'nope' }],
  ])('rejects %s', async (_name, over) => {
    const { agent, user } = await maintainer();
    const project = await makeProject(user.id);
    const res = await agent.post('/api/opportunities').send(payload(project.id, over));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/opportunities', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/opportunities')).status).toBe(401);
  });

  it('shows only open opportunities by default', async () => {
    const { agent, user } = await maintainer();
    const project = await makeProject(user.id);
    await makeOpportunity(project.id, user.id, { title: 'Open one' });
    await makeOpportunity(project.id, user.id, { title: 'Closed one', status: 'closed' });

    const res = await agent.get('/api/opportunities');
    expect(res.body.data.items.map((o) => o.title)).toEqual(['Open one']);
  });

  it('filters by difficulty, skill (case-insensitive, whole word), language and project', async () => {
    const { agent, user } = await maintainer();
    const go = await makeProject(user.id, { repoFullName: 'acme/gopher', language: 'Go' });
    const js = await makeProject(user.id, { repoFullName: 'acme/webby', language: 'JavaScript' });
    await makeOpportunity(go.id, user.id, { title: 'Go task', skills: ['Go'], difficulty: 'advanced' });
    await makeOpportunity(js.id, user.id, { title: 'React task', skills: ['React'], difficulty: 'beginner' });
    await makeOpportunity(js.id, user.id, { title: 'Native task', skills: ['React Native'], difficulty: 'beginner' });

    const titles = async (qs) => (await agent.get(`/api/opportunities?${qs}`)).body.data.items.map((o) => o.title).sort();

    expect(await titles('difficulty=advanced')).toEqual(['Go task']);
    expect(await titles('skill=react')).toEqual(['React task']);
    expect(await titles('language=JavaScript')).toEqual(['Native task', 'React task']);
    expect(await titles(`project=${go.id}`)).toEqual(['Go task']);
    expect(await titles(`project=${go.id}&language=JavaScript`)).toEqual([]);
  });

  it('paginates (10 per page, newest first)', async () => {
    const { agent, user } = await maintainer();
    const project = await makeProject(user.id);
    for (let i = 1; i <= 13; i++) await makeOpportunity(project.id, user.id, { title: `Task number ${i}` });

    const first = await agent.get('/api/opportunities');
    const second = await agent.get('/api/opportunities?page=2');

    expect(first.body.data.items).toHaveLength(10);
    expect(first.body.data.items[0].title).toBe('Task number 13');
    expect(first.body.data.pagination).toMatchObject({ totalCount: 13, totalPages: 2, page: 1 });
    expect(second.body.data.items).toHaveLength(3);
    expect(second.body.data.items.at(-1).title).toBe('Task number 1');
  });

  it('shows the viewer their own application, and pending counts only to managers', async () => {
    const owner = await maintainer();
    const applicant = await createAgent();
    const bystander = await createAgent();
    const project = await makeProject(owner.user.id);
    const opportunity = await makeOpportunity(project.id, owner.user.id);
    await makeApplication(opportunity.id, applicant.user.id);

    const first = async (agent) => (await agent.get('/api/opportunities')).body.data.items[0];

    expect((await first(applicant.agent)).myApplication).toMatchObject({ status: 'pending' });
    expect((await first(applicant.agent)).pendingApplications).toBeNull();
    expect((await first(bystander.agent)).myApplication).toBeNull();
    expect((await first(owner.agent)).pendingApplications).toBe(1);
  });

  it.each([['page=0'], ['difficulty=expert'], ['status=all'], ['project=nope']])('rejects invalid input: %s', async (qs) => {
    const { agent } = await createAgent();
    expect((await agent.get(`/api/opportunities?${qs}`)).status).toBe(400);
  });
});

describe('GET /api/opportunities/mine', () => {
  it('is forbidden for contributors', async () => {
    const { agent } = await createAgent();
    expect((await agent.get('/api/opportunities/mine')).status).toBe(403);
  });

  it('returns only your own opportunities, including closed ones', async () => {
    const me = await maintainer();
    const other = await maintainer();
    const mine = await makeProject(me.user.id, { repoFullName: 'me/mine' });
    const theirs = await makeProject(other.user.id, { repoFullName: 'them/theirs' });
    await makeOpportunity(mine.id, me.user.id, { title: 'My open task' });
    await makeOpportunity(mine.id, me.user.id, { title: 'My closed task', status: 'closed' });
    await makeOpportunity(theirs.id, other.user.id, { title: 'Not mine' });

    const res = await me.agent.get('/api/opportunities/mine');
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((o) => o.title).sort()).toEqual(['My closed task', 'My open task']);
  });
});

describe('GET /api/opportunities/:id', () => {
  it('returns the opportunity with permissions for the viewer', async () => {
    const owner = await maintainer();
    const other = await createAgent();
    const project = await makeProject(owner.user.id);
    const opportunity = await makeOpportunity(project.id, owner.user.id);

    expect((await owner.agent.get(`/api/opportunities/${opportunity.id}`)).body.data.opportunity.canManage).toBe(true);
    expect((await other.agent.get(`/api/opportunities/${opportunity.id}`)).body.data.opportunity.canManage).toBe(false);
  });

  it('returns 404 for an unknown id and 400 for a malformed one', async () => {
    const { agent } = await createAgent();
    expect((await agent.get(`/api/opportunities/${UNKNOWN_ID}`)).status).toBe(404);
    expect((await agent.get('/api/opportunities/nope')).status).toBe(400);
  });
});

describe('PATCH /api/opportunities/:id', () => {
  async function setup() {
    const owner = await maintainer();
    const project = await makeProject(owner.user.id);
    const opportunity = await makeOpportunity(project.id, owner.user.id);
    return { owner, project, opportunity };
  }

  it('lets the owner close and edit it', async () => {
    const { owner, opportunity } = await setup();
    const res = await owner.agent.patch(`/api/opportunities/${opportunity.id}`).send({ status: 'closed', title: 'A new title' });

    expect(res.status).toBe(200);
    expect(res.body.data.opportunity).toMatchObject({ status: 'closed', title: 'A new title' });
  });

  it('forbids other maintainers', async () => {
    const { opportunity } = await setup();
    const other = await maintainer();
    expect((await other.agent.patch(`/api/opportunities/${opportunity.id}`).send({ status: 'closed' })).status).toBe(403);
  });

  it('validates the hours rule after merging with stored values', async () => {
    const { owner, opportunity } = await setup(); // stored: 2-5 hours
    const res = await owner.agent.patch(`/api/opportunities/${opportunity.id}`).send({ expectedHoursMax: 1 });
    expect(res.status).toBe(400);
  });

  it('rejects an empty body and cannot move the opportunity to another project', async () => {
    const { owner, project, opportunity } = await setup();
    const elsewhere = await makeProject(owner.user.id, { repoFullName: 'acme/elsewhere' });

    expect((await owner.agent.patch(`/api/opportunities/${opportunity.id}`).send({})).status).toBe(400);
    await owner.agent.patch(`/api/opportunities/${opportunity.id}`).send({ title: 'Another title', project: elsewhere.id });
    expect(String((await Opportunity.findById(opportunity.id)).project)).toBe(project.id);
  });
});

describe('DELETE /api/opportunities/:id', () => {
  it('deletes the opportunity and its applications (owner only)', async () => {
    const owner = await maintainer();
    const other = await maintainer();
    const applicant = await createAgent();
    const project = await makeProject(owner.user.id);
    const opportunity = await makeOpportunity(project.id, owner.user.id);
    await makeApplication(opportunity.id, applicant.user.id);

    expect((await other.agent.delete(`/api/opportunities/${opportunity.id}`)).status).toBe(403);
    expect((await owner.agent.delete(`/api/opportunities/${opportunity.id}`)).status).toBe(200);
    expect(await Opportunity.countDocuments()).toBe(0);
    expect(await Application.countDocuments()).toBe(0);
  });
});