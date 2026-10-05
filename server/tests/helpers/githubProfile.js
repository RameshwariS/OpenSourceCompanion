import { githubClient } from '../../src/config/githubClient.js';
import User from '../../src/models/User.js';
import { githubError } from './github.js';

// NOTE: test files using this must start with:
//   vi.mock('../src/config/githubClient.js', () => ({ githubClient: { get: vi.fn() } }));

export const pr = (over = {}) => ({
  id: 1,
  number: 1,
  title: 'Improve docs',
  state: 'open',
  draft: false,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-02T00:00:00Z',
  closed_at: null,
  html_url: 'https://github.com/acme/widgets/pull/1',
  repository_url: 'https://api.github.com/repos/acme/widgets',
  pull_request: { merged_at: null },
  ...over,
});

const merged = (over) =>
  pr({ state: 'closed', closed_at: '2026-03-03T00:00:00Z', pull_request: { merged_at: '2026-03-03T00:00:00Z' }, ...over });

const openPr = pr({ id: 1, number: 1 });
const mergedExternal = merged({ id: 2, number: 2 });
const mergedOwn = merged({ id: 3, number: 3, repository_url: 'https://api.github.com/repos/alice/own' });
const closedPr = pr({ id: 4, number: 4, state: 'closed', closed_at: '2026-03-04T00:00:00Z' });

/** alice has 4 PRs: 1 open, 2 merged (one on her own repo), 1 closed without merging. */
export function mockProfileGithub({ events = [] } = {}) {
  githubClient.get.mockImplementation(async (url, config = {}) => {
    if (url === '/search/issues') {
      const q = config.params.q;
      if (q.includes('is:merged')) return { data: { total_count: 2, items: [mergedExternal, mergedOwn] } };
      if (q.includes('is:open')) return { data: { total_count: 1, items: [openPr] } };
      return { data: { total_count: 4, items: [openPr, mergedExternal, mergedOwn, closedPr] } };
    }
    if (/\/pulls\/\d+\/reviews$/.test(url)) return { data: [{ user: { login: 'rev' }, state: 'CHANGES_REQUESTED' }] };
    if (url.includes('/events/public')) return { data: config.params.page === 1 ? events : [] };
    throw githubError(404);
  });
}

let githubIdCounter = 1000;
export async function connectGithub(userId, login = 'alice') {
  await User.updateOne(
    { _id: userId },
    { $set: { 'github.id': ++githubIdCounter, 'github.username': login, 'github.avatarUrl': 'https://avatars.githubusercontent.com/u/1' } },
  );
}

export const searchCallCount = () => githubClient.get.mock.calls.filter(([url]) => url === '/search/issues').length;