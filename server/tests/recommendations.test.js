import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Contribution from '../src/models/Contribution.js';
import Issue from '../src/models/Issue.js';
import User from '../src/models/User.js';
import { githubClient } from '../src/config/githubClient.js';
import { clearCache } from '../src/utils/cache.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { githubError, searchCalls, searchItem } from './helpers/github.js';

vi.mock('../src/config/githubClient.js', () => ({ githubClient: { get: vi.fn() } }));

beforeAll(connectTestDB);
afterEach(async () => {
  await clearTestDB();
  clearCache();
  vi.clearAllMocks();
});
afterAll(closeTestDB);

const repoUrl = (name) => `https://api.github.com/repos/acme/${name}`;
const OLD = '2020-01-01T00:00:00Z';

const goIssue = searchItem({
  id: 1,
  number: 1,
  title: 'Add flag parsing',
  repository_url: repoUrl('go-thing'),
  updated_at: OLD,
  labels: [{ name: 'good first issue', color: 'x' }, { name: 'help wanted', color: 'y' }],
});
const goIssue2 = searchItem({ id: 3, number: 3, title: 'Second', repository_url: repoUrl('go-thing'), updated_at: OLD });
const pyIssue = searchItem({ id: 2, number: 2, title: 'Add Docker support', repository_url: repoUrl('py-thing'), updated_at: OLD });

const REPOS = {
  'acme/go-thing': { stargazers_count: 50, language: 'Go' },
  'acme/py-thing': { stargazers_count: 50, language: 'Python' },
};

// Search results depend on the language: qualifier in the query. "*" = no language qualifier.
function mockSearch(byLanguage = {}, failFor = []) {
  githubClient.get.mockImplementation(async (url, config = {}) => {
    if (url === '/search/issues') {
      const lang = /language:"([^"]+)"/.exec(config.params.q)?.[1] ?? '*';
      if (failFor.includes(lang)) throw githubError(502);
      const items = byLanguage[lang] ?? [];
      return { data: { total_count: items.length, items } };
    }
    const repo = /^\/repos\/(acme\/[^/]+)$/.exec(url);
    if (repo && REPOS[repo[1]]) return { data: REPOS[repo[1]] };
    throw githubError(404);
  });
}

const withSkills = async (skills) => {
  const created = await createAgent();
  await User.updateOne({ _id: created.user.id }, { skills });
  return created;
};

const snapshot = (githubId, over = {}) =>
  Issue.create({
    githubId,
    repoFullName: 'acme/go-thing',
    number: githubId,
    title: `Issue ${githubId}`,
    state: 'open',
    htmlUrl: `https://github.com/acme/go-thing/issues/${githubId}`,
    ...over,
  });

describe('GET /api/issues/recommended', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/issues/recommended')).status).toBe(401);
  });

  it('falls back to a general beginner feed when there is nothing to personalize with', async () => {
    mockSearch({ '*': [pyIssue] });
    const { agent } = await createAgent();

    const res = await agent.get('/api/issues/recommended');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ fallback: true, basedOn: [], partial: false });
    expect(res.body.data.items).toHaveLength(1);
    expect(searchCalls()).toHaveLength(1);
    expect(searchCalls()[0][1].params.q).not.toContain('language:');
  });

  it('searches by language and skill keyword, then ranks by score with reasons', async () => {
    mockSearch({ Go: [goIssue], '*': [pyIssue] });
    const { agent } = await withSkills(['Go', 'Docker']);

    const res = await agent.get('/api/issues/recommended');
    const queries = searchCalls().map((c) => c[1].params.q);

    expect(queries.some((q) => q.includes('language:"Go"'))).toBe(true);
    expect(queries.some((q) => q.includes('"Docker"'))).toBe(true);
    expect(res.body.data.basedOn).toEqual(['Go', 'Docker']);
    expect(res.body.data.fallback).toBe(false);

    const [first, second] = res.body.data.items;
    expect(first).toMatchObject({ githubId: 1, score: 11 }); // language 5 + beginner 4 + help wanted 2
    expect(first.reasons.join(' ')).toMatch(/Go/);
    expect(second).toMatchObject({ githubId: 2, score: 9 }); // skill 5 + beginner 4
    expect(res.body.data.weights.languageMatch).toBe(5);
  });

  it('removes duplicates found by several searches', async () => {
    mockSearch({ Go: [goIssue], '*': [goIssue] });
    const { agent } = await withSkills(['Go', 'Docker']);

    const res = await agent.get('/api/issues/recommended');
    expect(res.body.data.items).toHaveLength(1);
  });

  it('hides issues you already track', async () => {
    mockSearch({ Go: [goIssue, goIssue2] });
    const { agent, user } = await withSkills(['Go']);
    const tracked = await snapshot(1);
    await Contribution.create({ user: user.id, issue: tracked._id, status: 'working' });

    const res = await agent.get('/api/issues/recommended');
    expect(res.body.data.items.map((i) => i.githubId)).toEqual([3]);
  });

  it('uses the languages of issues you tracked or bookmarked, even without skills', async () => {
    mockSearch({ Python: [pyIssue] });
    const { agent, user } = await createAgent();
    const tracked = await snapshot(999, { language: 'Python' });
    await Contribution.create({ user: user.id, issue: tracked._id, status: 'working' });

    const res = await agent.get('/api/issues/recommended');

    expect(res.body.data).toMatchObject({ fallback: false, basedOn: ['Python'] });
    expect(res.body.data.items[0].reasons.join(' ')).toMatch(/before/);
  });

  it('cannot be tricked into adding GitHub search operators through a skill', async () => {
    mockSearch({ '*': [pyIssue] });
    const { agent } = await withSkills(['org:evil']);

    await agent.get('/api/issues/recommended');
    const q = searchCalls()[0][1].params.q;

    expect(q).toContain('"org evil"');
    expect(q).not.toContain('org:evil');
  });

  it('respects the limit and validates it', async () => {
    mockSearch({ Go: [goIssue, goIssue2] });
    const { agent } = await withSkills(['Go']);

    expect((await agent.get('/api/issues/recommended?limit=1')).body.data.items).toHaveLength(1);
    expect((await agent.get('/api/issues/recommended?limit=0')).status).toBe(400);
    expect((await agent.get('/api/issues/recommended?limit=31')).status).toBe(400);
  });

  it('still answers when one of the searches fails', async () => {
    mockSearch({ '*': [pyIssue] }, ['Go']);
    const { agent } = await withSkills(['Go', 'Docker']);

    const res = await agent.get('/api/issues/recommended');
    expect(res.status).toBe(200);
    expect(res.body.data.partial).toBe(true);
    expect(res.body.data.items.map((i) => i.githubId)).toEqual([2]);
  });

  it('returns the error when every search fails', async () => {
    githubClient.get.mockRejectedValue(githubError(403, { 'x-ratelimit-remaining': '0' }));
    const { agent } = await withSkills(['Go']);

    expect((await agent.get('/api/issues/recommended')).status).toBe(429);
  });
});