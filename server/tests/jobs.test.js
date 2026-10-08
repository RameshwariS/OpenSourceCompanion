import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Contribution from '../src/models/Contribution.js';
import Issue from '../src/models/Issue.js';
import Notification from '../src/models/Notification.js';
import OrgFollow from '../src/models/OrgFollow.js';
import User from '../src/models/User.js';
import { githubClient } from '../src/config/githubClient.js';
import { checkMergedPullRequests, resetPullRequestCursor } from '../src/jobs/mergedPullRequests.job.js';
import { checkOrgIssues } from '../src/jobs/orgIssues.job.js';
import { checkTrackedIssues } from '../src/jobs/trackedIssues.job.js';
import { clearCache } from '../src/utils/cache.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { githubError, mockGithub, searchItem } from './helpers/github.js';
import { connectGithub, mockProfileGithub } from './helpers/githubProfile.js';

vi.mock('../src/config/githubClient.js', () => ({ githubClient: { get: vi.fn() } }));

beforeAll(connectTestDB);
beforeEach(() => {
  resetPullRequestCursor();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  await clearTestDB();
  clearCache();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
afterAll(closeTestDB);

const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();
const orgIssue = (n, createdAt, over = {}) =>
  searchItem({ id: 1000 + n, number: n, title: `Issue ${n}`, created_at: createdAt, ...over });

function mockOrgSearch(items, total = items.length) {
  githubClient.get.mockImplementation(async (url) => {
    if (url === '/search/issues') return { data: { total_count: total, items } };
    throw githubError(404);
  });
}

// followedMinutesAgo: createdAt and lastCheckedAt are both set to that moment
async function follow(userId, { org = 'acme', followedMinutesAgo = 60 } = {}) {
  const doc = await OrgFollow.create({ user: userId, org, orgKey: org.toLowerCase() });
  const at = new Date(Date.now() - followedMinutesAgo * 60_000);
  // Raw collection: mongoose treats createdAt as immutable
  await OrgFollow.collection.updateOne({ _id: doc._id }, { $set: { createdAt: at, lastCheckedAt: at } });
  return doc;
}

describe('checkOrgIssues', () => {
  it('notifies a follower about a new issue, with an internal link', async () => {
    const { user } = await createAgent();
    await follow(user.id);
    mockOrgSearch([orgIssue(5, minutesAgo(2))]);

    expect(await checkOrgIssues()).toBe(1);

    const [n] = await Notification.find({ user: user.id });
    expect(n).toMatchObject({ type: 'org_issue', link: '/issues/acme/widgets/5' });
    expect(n.message).toContain('Issue 5');

    const q = githubClient.get.mock.calls[0][1].params.q;
    expect(q).toContain('org:acme');
    expect(q).toContain('is:issue');
    expect(q).toContain('is:open');
  });

  it('never notifies twice about the same issue', async () => {
    const { user } = await createAgent();
    await follow(user.id);
    mockOrgSearch([orgIssue(5, minutesAgo(2))]);

    await checkOrgIssues();
    await checkOrgIssues();
    expect(await Notification.countDocuments({ user: user.id })).toBe(1);
  });

  it('ignores issues created before the user followed the organization', async () => {
    const { user } = await createAgent();
    await follow(user.id, { followedMinutesAgo: 0 });
    mockOrgSearch([orgIssue(5, minutesAgo(5))]);

    await checkOrgIssues();
    expect(await Notification.countDocuments()).toBe(0);
  });

  it('does not notify people about issues they opened themselves', async () => {
    const { user } = await createAgent();
    await connectGithub(user.id, 'alice');
    await follow(user.id);
    mockOrgSearch([orgIssue(5, minutesAgo(2), { user: { login: 'Alice', avatar_url: 'x' } })]);

    await checkOrgIssues();
    expect(await Notification.countDocuments()).toBe(0);
  });

  it('collapses a flood into 5 notifications plus one summary', async () => {
    const { user } = await createAgent();
    await follow(user.id);
    mockOrgSearch(Array.from({ length: 8 }, (_, i) => orgIssue(i + 1, minutesAgo(10 - i))));

    await checkOrgIssues();

    expect(await Notification.countDocuments({ type: 'org_issue' })).toBe(5);
    const summary = await Notification.findOne({ type: 'org_issue_summary' });
    expect(summary.message).toContain('3 more');
    expect(summary.link).toBe('/issues?org=acme&sort=created');
  });

  it('advances the follow\'s checkpoint', async () => {
    const { user } = await createAgent();
    const f = await follow(user.id);
    mockOrgSearch([]);

    const before = Date.now();
    await checkOrgIssues();
    expect((await OrgFollow.findById(f.id)).lastCheckedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('skips suspended users', async () => {
    const { user } = await createAgent();
    await follow(user.id);
    await User.updateOne({ _id: user.id }, { status: 'suspended' });
    mockOrgSearch([orgIssue(5, minutesAgo(2))]);

    await checkOrgIssues();
    expect(await Notification.countDocuments()).toBe(0);
  });

  it('keeps going when one organization fails', async () => {
    const broken = await createAgent();
    const working = await createAgent();
    await follow(broken.user.id, { org: 'broken' });
    await follow(working.user.id, { org: 'acme' });

    githubClient.get.mockImplementation(async (url, config) => {
      if (config.params.q.includes('org:broken')) throw githubError(502);
      return { data: { total_count: 1, items: [orgIssue(5, minutesAgo(2))] } };
    });

    await checkOrgIssues();
    expect(await Notification.countDocuments({ user: working.user.id })).toBe(1);
    expect(await Notification.countDocuments({ user: broken.user.id })).toBe(0);
  });
});

describe('checkMergedPullRequests', () => {
  it('notifies about recently merged pull requests, once each', async () => {
    mockProfileGithub();
    const { user } = await createAgent();
    await connectGithub(user.id, 'alice');
    const now = new Date('2026-03-03T12:00:00Z'); // 12 hours after the mocked merges

    await checkMergedPullRequests(now);
    await checkMergedPullRequests(now);

    const list = await Notification.find({ user: user.id, type: 'pr_merged' });
    expect(list).toHaveLength(2);
    expect(list[0].link).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/);
  });

  it('ignores pull requests merged a long time ago', async () => {
    mockProfileGithub();
    const { user } = await createAgent();
    await connectGithub(user.id, 'alice');

    await checkMergedPullRequests(new Date('2026-04-10T00:00:00Z'));
    expect(await Notification.countDocuments()).toBe(0);
  });
});

describe('checkTrackedIssues', () => {
  const makeIssue = () =>
    Issue.create({
      githubId: 101,
      repoFullName: 'acme/widgets',
      number: 7,
      title: 'Fix typo in docs',
      state: 'open',
      htmlUrl: 'https://github.com/acme/widgets/issues/7',
      syncedAt: new Date(0),
    });

  it('notifies people tracking an issue that was closed, but not those who already finished', async () => {
    mockGithub({ items: [searchItem({ id: 101, number: 7, state: 'closed' })] });
    const working = await createAgent();
    const done = await createAgent();
    const issue = await makeIssue();
    await Contribution.create({ user: working.user.id, issue: issue._id, status: 'working' });
    await Contribution.create({ user: done.user.id, issue: issue._id, status: 'merged' });

    await checkTrackedIssues();

    const n = await Notification.findOne({ user: working.user.id });
    expect(n).toMatchObject({ type: 'issue_closed', link: '/issues/acme/widgets/7' });
    expect(await Notification.countDocuments({ user: done.user.id })).toBe(0);
    expect((await Issue.findById(issue.id)).state).toBe('closed');
  });

  it('stays quiet while the issue is still open, but refreshes the snapshot', async () => {
    mockGithub({ items: [searchItem({ id: 101, number: 7, state: 'open' })] });
    const { user } = await createAgent();
    const issue = await makeIssue();
    await Contribution.create({ user: user.id, issue: issue._id, status: 'working' });

    await checkTrackedIssues();

    expect(await Notification.countDocuments()).toBe(0);
    expect((await Issue.findById(issue.id)).syncedAt.getTime()).toBeGreaterThan(0);
  });
});