import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Issue from '../src/models/Issue.js';
import Bookmark from '../src/models/Bookmark.js';
import { clearCache } from '../src/utils/cache.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { mockGithub, searchItem } from './helpers/github.js';

vi.mock('../src/config/githubClient.js', () => ({ githubClient: { get: vi.fn() } }));

const issueA = searchItem({ id: 101, number: 7, title: 'Fix typo in docs' });
const issueB = searchItem({
  id: 102,
  number: 8,
  title: 'Add dark mode',
  labels: [{ name: 'help wanted', color: '008672' }],
});

beforeAll(connectTestDB);
beforeEach(() => mockGithub({ items: [issueA, issueB] }));
afterEach(async () => {
  await clearTestDB();
  clearCache();
  vi.clearAllMocks();
});
afterAll(closeTestDB);

const add = (agent, number) => agent.post('/api/bookmarks').send({ repo: 'acme/widgets', number });

describe('POST /api/bookmarks', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/bookmarks').send({ repo: 'acme/widgets', number: 7 });
    expect(res.status).toBe(401);
  });

  it('creates a bookmark and stores a snapshot fetched from GitHub', async () => {
    const { agent } = await createAgent();
    const res = await add(agent, 7);

    expect(res.status).toBe(201);
    expect(res.body.data.bookmark.issue).toMatchObject({ githubId: 101, title: 'Fix typo in docs', stars: 1234 });
    expect(await Issue.countDocuments()).toBe(1);
  });

  it('ignores issue data sent by the client', async () => {
    const { agent } = await createAgent();
    await agent.post('/api/bookmarks').send({
      repo: 'acme/widgets',
      number: 7,
      issue: { title: 'HACKED', githubId: 999 },
    });

    const stored = await Issue.findOne();
    expect(stored.title).toBe('Fix typo in docs');
    expect(stored.githubId).toBe(101);
  });

  it('returns 409 for a duplicate and keeps a single bookmark', async () => {
    const { agent } = await createAgent();
    await add(agent, 7);
    const res = await add(agent, 7);

    expect(res.status).toBe(409);
    expect(await Bookmark.countDocuments()).toBe(1);
  });

  it('lets two users bookmark the same issue (one shared snapshot)', async () => {
    const one = await createAgent();
    const two = await createAgent();
    expect((await add(one.agent, 7)).status).toBe(201);
    expect((await add(two.agent, 7)).status).toBe(201);
    expect(await Issue.countDocuments()).toBe(1);
    expect(await Bookmark.countDocuments()).toBe(2);
  });

  it('returns 404 when the issue does not exist on GitHub', async () => {
    const { agent } = await createAgent();
    const res = await add(agent, 999);
    expect(res.status).toBe(404);
  });

  it.each([
    [{ repo: 'nope', number: 7 }],
    [{ repo: 'acme/widgets', number: 0 }],
    [{ repo: 'acme/widgets' }],
  ])('rejects invalid body %j', async (body) => {
    const { agent } = await createAgent();
    const res = await agent.post('/api/bookmarks').send(body);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/bookmarks', () => {
  it('sorts newest first by default and oldest on request', async () => {
    const { agent } = await createAgent();
    await add(agent, 7);
    await add(agent, 8);

    const newest = await agent.get('/api/bookmarks');
    const oldest = await agent.get('/api/bookmarks?sort=oldest');

    expect(newest.body.data.bookmarks.map((b) => b.issue.number)).toEqual([8, 7]);
    expect(oldest.body.data.bookmarks.map((b) => b.issue.number)).toEqual([7, 8]);
  });

  it('filters by difficulty and text', async () => {
    const { agent } = await createAgent();
    await add(agent, 7);
    await add(agent, 8);

    const intermediate = await agent.get('/api/bookmarks?difficulty=intermediate');
    const search = await agent.get('/api/bookmarks?q=typo');

    expect(intermediate.body.data.bookmarks.map((b) => b.issue.number)).toEqual([8]);
    expect(search.body.data.bookmarks.map((b) => b.issue.number)).toEqual([7]);
  });

  it('only returns the current user\'s bookmarks', async () => {
    const one = await createAgent();
    const two = await createAgent();
    await add(one.agent, 7);

    const res = await two.agent.get('/api/bookmarks');
    expect(res.body.data.bookmarks).toHaveLength(0);
  });
});

describe('DELETE /api/bookmarks/:id', () => {
  it('removes your own bookmark', async () => {
    const { agent } = await createAgent();
    const { body } = await add(agent, 7);

    const res = await agent.delete(`/api/bookmarks/${body.data.bookmark.id}`);
    expect(res.status).toBe(200);
    expect(await Bookmark.countDocuments()).toBe(0);
  });

  it('returns 404 for someone else\'s bookmark and does not delete it', async () => {
    const owner = await createAgent();
    const intruder = await createAgent();
    const { body } = await add(owner.agent, 7);

    const res = await intruder.agent.delete(`/api/bookmarks/${body.data.bookmark.id}`);
    expect(res.status).toBe(404);
    expect(await Bookmark.countDocuments()).toBe(1);
  });

  it('returns 400 for a malformed id', async () => {
    const { agent } = await createAgent();
    const res = await agent.delete('/api/bookmarks/not-an-id');
    expect(res.status).toBe(400);
  });
});

describe('bookmark state in issue results', () => {
  it('marks bookmarked issues for the current user only', async () => {
    const one = await createAgent();
    const two = await createAgent();
    const { body } = await add(one.agent, 7);

    const mine = await one.agent.get('/api/issues');
    const theirs = await two.agent.get('/api/issues');

    const find = (res, n) => res.body.data.items.find((i) => i.number === n);
    expect(find(mine, 7).bookmarkId).toBe(body.data.bookmark.id);
    expect(find(mine, 8).bookmarkId).toBeNull();
    expect(find(theirs, 7).bookmarkId).toBeNull();
  });
});