import { githubClient } from '../../src/config/githubClient.js';

// NOTE: every test file that uses this must start with:
//   vi.mock('../src/config/githubClient.js', () => ({ githubClient: { get: vi.fn() } }));

export const searchItem = (over = {}) => ({
  id: 101,
  number: 7,
  title: 'Fix typo in docs',
  state: 'open',
  body: 'Please fix the typo.',
  comments: 3,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  html_url: 'https://github.com/acme/widgets/issues/7',
  repository_url: 'https://api.github.com/repos/acme/widgets',
  labels: [{ name: 'good first issue', color: '7057ff' }],
  user: { login: 'alice', avatar_url: 'https://avatars.githubusercontent.com/u/1' },
  ...over,
});

export function githubError(status, headers = {}) {
  const err = new Error(`GitHub ${status}`);
  err.response = { status, headers, data: { message: 'mock' } };
  return err;
}

export function mockGithub({
  items = [searchItem()],
  total = items.length,
  comments = [],
  repo = { stargazers_count: 1234, language: 'TypeScript' },
} = {}) {
  githubClient.get.mockImplementation(async (url) => {
    if (url === '/search/issues') return { data: { total_count: total, items } };
    if (url === '/repos/acme/widgets') return { data: repo };

    const match = url.match(/^\/repos\/acme\/widgets\/issues\/(\d+)(\/comments)?$/);
    if (match) {
      if (match[2]) return { data: comments };
      const found = items.find((i) => i.number === Number(match[1]));
      if (found) return { data: found };
    }
    throw githubError(404);
  });
}

export const searchCalls = () => githubClient.get.mock.calls.filter(([url]) => url === '/search/issues');