import { githubClient } from '../../src/config/githubClient.js';
import { githubError, searchItem } from './github.js';

// NOTE: test files using this must start with:
//   vi.mock('../src/config/githubClient.js', () => ({ githubClient: { get: vi.fn() } }));

export const repoFixture = (over = {}) => ({
  full_name: 'acme/widgets',
  name: 'widgets',
  description: 'Widgets for everyone',
  language: 'TypeScript',
  topics: ['ui', 'widgets'],
  stargazers_count: 1234,
  forks_count: 56,
  archived: false,
  license: { spdx_id: 'MIT' },
  owner: { id: 42, login: 'acme', type: 'Organization', avatar_url: 'https://avatars.githubusercontent.com/u/42' },
  ...over,
});

const issues = (total, helpWanted) =>
  Array.from({ length: Math.min(total, 20) }, (_, i) =>
    searchItem({
      id: (helpWanted ? 900 : 500) + i,
      number: (helpWanted ? 100 : 0) + i + 1,
      title: `${helpWanted ? 'Help' : 'Starter'} issue ${i + 1}`,
      labels: [{ name: helpWanted ? 'help wanted' : 'good first issue', color: '7057ff' }],
    }),
  );

export function mockProjectGithub({
  repo = repoFixture(),
  beginnerTotal = 3,
  helpTotal = 2,
  contributorsLink = '<https://api.github.com/repositories/1/contributors?per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/contributors?per_page=1&page=87>; rel="last"',
  publicMembers = [],
  events = [],
  languages = { TypeScript: 8000, CSS: 2000 },
  repoMissing = false,
  eventsFail = false,
} = {}) {
  githubClient.get.mockImplementation(async (rawUrl, config = {}) => {
    const url = rawUrl.toLowerCase(); // GitHub names are case-insensitive

    if (url === '/search/issues') {
      const helpWanted = config.params.q.includes('label:"help wanted"');
      const total = helpWanted ? helpTotal : beginnerTotal;
      return { data: { total_count: total, items: issues(total, helpWanted) } };
    }
    if (url === '/repos/acme/widgets') {
      if (repoMissing) throw githubError(404);
      return { data: repo };
    }
    if (url === '/repos/acme/widgets/languages') return { data: languages };
    if (url === '/repos/acme/widgets/events') {
      if (eventsFail) throw githubError(502);
      return { data: events };
    }
    if (url === '/repos/acme/widgets/contributors') {
      return { data: [{ login: 'a' }], headers: contributorsLink ? { link: contributorsLink } : {} };
    }
    const member = url.match(/^\/orgs\/acme\/public_members\/(.+)$/);
    if (member && publicMembers.includes(decodeURIComponent(member[1]))) return { status: 204, data: '' };

    throw githubError(404);
  });
}