import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Application from '../src/models/Application.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { makeApplication, makeOpportunity, makeProject } from './helpers/factories.js';

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

const message = 'I have worked with React for a year and would love to help.';

async function setup(opportunityOver = {}) {
  const owner = await createAgent({ role: 'maintainer' });
  const project = await makeProject(owner.user.id);
  const opportunity = await makeOpportunity(project.id, owner.user.id, opportunityOver);
  return { owner, project, opportunity };
}

const apply = (agent, opportunityId, body = { message }) =>
  agent.post(`/api/opportunities/${opportunityId}/applications`).send(body);

describe('POST /api/opportunities/:id/applications', () => {
  it('requires authentication', async () => {
    const { opportunity } = await setup();
    const res = await request(app).post(`/api/opportunities/${opportunity.id}/applications`).send({ message });
    expect(res.status).toBe(401);
  });

  it('sends a pending application', async () => {
    const { opportunity } = await setup();
    const { agent, user } = await createAgent();

    const res = await apply(agent, opportunity.id);

    expect(res.status).toBe(201);
    expect(res.body.data.application).toMatchObject({ status: 'pending', message, reply: '' });
    const stored = await Application.findOne();
    expect(String(stored.applicant)).toBe(user.id);
  });

  it('returns 409 when applying twice and keeps one application', async () => {
    const { opportunity } = await setup();
    const { agent } = await createAgent();

    await apply(agent, opportunity.id);
    expect((await apply(agent, opportunity.id)).status).toBe(409);
    expect(await Application.countDocuments()).toBe(1);
  });

  it('does not let you apply to your own opportunity', async () => {
    const { owner, opportunity } = await setup();
    expect((await apply(owner.agent, opportunity.id)).status).toBe(400);
  });

  it('does not accept applications to a closed opportunity', async () => {
    const { opportunity } = await setup({ status: 'closed' });
    const { agent } = await createAgent();
    expect((await apply(agent, opportunity.id)).status).toBe(400);
  });

  it('validates the message and the id', async () => {
    const { opportunity } = await setup();
    const { agent } = await createAgent();

    expect((await apply(agent, opportunity.id, { message: 'hi' })).status).toBe(400);
    expect((await apply(agent, opportunity.id, {})).status).toBe(400);
    expect((await apply(agent, 'nope')).status).toBe(400);
    expect((await apply(agent, '64b7f0f0f0f0f0f0f0f0f0f0')).status).toBe(404);
  });
});

describe('GET /api/opportunities/:id/applications', () => {
  it('shows applicants to the owner without private details', async () => {
    const { owner, opportunity } = await setup();
    const applicant = await createAgent();
    await makeApplication(opportunity.id, applicant.user.id);

    const res = await owner.agent.get(`/api/opportunities/${opportunity.id}/applications`);

    expect(res.status).toBe(200);
    expect(res.body.data.applications).toHaveLength(1);
    expect(res.body.data.applications[0].applicant).toMatchObject({ username: applicant.user.username });
    expect(JSON.stringify(res.body)).not.toContain(applicant.user.email);
  });

  it('is forbidden for everyone else', async () => {
    const { opportunity } = await setup();
    const { agent } = await createAgent();
    expect((await agent.get(`/api/opportunities/${opportunity.id}/applications`)).status).toBe(403);
  });
});

describe('PATCH /api/applications/:id', () => {
  const respond = (agent, id, body) => agent.patch(`/api/applications/${id}`).send(body);

  it('lets the owner accept with a reply, once', async () => {
    const { owner, opportunity } = await setup();
    const applicant = await createAgent();
    const application = await makeApplication(opportunity.id, applicant.user.id);

    const res = await respond(owner.agent, application.id, { status: 'accepted', reply: 'Welcome aboard!' });
    expect(res.status).toBe(200);
    expect(res.body.data.application).toMatchObject({ status: 'accepted', reply: 'Welcome aboard!' });
    expect(res.body.data.application.respondedAt).not.toBeNull();

    expect((await respond(owner.agent, application.id, { status: 'declined' })).status).toBe(409);
  });

  it('forbids anyone who does not manage the project', async () => {
    const { opportunity } = await setup();
    const applicant = await createAgent();
    const other = await createAgent({ role: 'maintainer' });
    const application = await makeApplication(opportunity.id, applicant.user.id);

    expect((await respond(other.agent, application.id, { status: 'accepted' })).status).toBe(403);
    expect((await respond(applicant.agent, application.id, { status: 'accepted' })).status).toBe(403);
    expect((await Application.findById(application.id)).status).toBe('pending');
  });

  it('rejects invalid statuses', async () => {
    const { owner, opportunity } = await setup();
    const applicant = await createAgent();
    const application = await makeApplication(opportunity.id, applicant.user.id);

    expect((await respond(owner.agent, application.id, { status: 'pending' })).status).toBe(400);
    expect((await respond(owner.agent, application.id, { status: 'maybe' })).status).toBe(400);
  });
});

describe('GET /api/applications/mine and DELETE /api/applications/:id', () => {
  it('lists only your own applications', async () => {
    const { opportunity } = await setup();
    const one = await createAgent();
    const two = await createAgent();
    await makeApplication(opportunity.id, one.user.id);

    const mine = await one.agent.get('/api/applications/mine');
    expect(mine.body.data.applications).toHaveLength(1);
    expect(mine.body.data.applications[0].opportunity).toMatchObject({ id: opportunity.id, repoFullName: 'acme/widgets' });
    expect((await two.agent.get('/api/applications/mine')).body.data.applications).toHaveLength(0);
  });

  it('lets you withdraw a pending application', async () => {
    const { opportunity } = await setup();
    const { agent, user } = await createAgent();
    const application = await makeApplication(opportunity.id, user.id);

    expect((await agent.delete(`/api/applications/${application.id}`)).status).toBe(200);
    expect(await Application.countDocuments()).toBe(0);
  });

  it('does not allow withdrawing an application that was already answered', async () => {
    const { opportunity } = await setup();
    const { agent, user } = await createAgent();
    const application = await makeApplication(opportunity.id, user.id, { status: 'accepted' });

    expect((await agent.delete(`/api/applications/${application.id}`)).status).toBe(400);
    expect(await Application.countDocuments()).toBe(1);
  });
});