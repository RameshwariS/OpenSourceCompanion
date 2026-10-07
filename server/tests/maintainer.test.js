import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { makeApplication, makeOpportunity, makeProject } from './helpers/factories.js';

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe('GET /api/maintainer/dashboard', () => {
  it('requires authentication and the maintainer role', async () => {
    expect((await request(app).get('/api/maintainer/dashboard')).status).toBe(401);
    const { agent } = await createAgent();
    expect((await agent.get('/api/maintainer/dashboard')).status).toBe(403);
  });

  it('returns zeros for a maintainer with no projects', async () => {
    const { agent } = await createAgent({ role: 'maintainer' });
    const res = await agent.get('/api/maintainer/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      projects: [],
      totals: { projects: 0, openOpportunities: 0, pendingApplications: 0 },
    });
  });

  it('counts opportunities and pending applications per project', async () => {
    const { agent, user } = await createAgent({ role: 'maintainer' });
    const other = await createAgent({ role: 'maintainer' });
    const project = await makeProject(user.id);
    const elsewhere = await makeProject(other.user.id, { repoFullName: 'them/theirs' });

    const open = await makeOpportunity(project.id, user.id);
    await makeOpportunity(project.id, user.id, { status: 'closed' });
    const notMine = await makeOpportunity(elsewhere.id, other.user.id);

    const [a, b, c, d] = await Promise.all([createAgent(), createAgent(), createAgent(), createAgent()]);
    await makeApplication(open.id, a.user.id);
    await makeApplication(open.id, b.user.id);
    await makeApplication(open.id, c.user.id, { status: 'accepted' });
    await makeApplication(notMine.id, d.user.id);

    const res = await agent.get('/api/maintainer/dashboard');

    expect(res.body.data.totals).toEqual({ projects: 1, openOpportunities: 1, pendingApplications: 2 });
    expect(res.body.data.projects[0]).toMatchObject({
      project: { repoFullName: 'acme/widgets' },
      openOpportunities: 1,
      closedOpportunities: 1,
      pendingApplications: 2,
    });
  });
});