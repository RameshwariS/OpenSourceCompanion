import { SEARCH_LABELS } from './difficulty.service.js';
import * as github from './github.service.js';
import { fromGithub, repoFullNameOf, withoutBody } from '../utils/issueMapper.js';

export const PER_PAGE = 20;
const GITHUB_MAX_RESULTS = 1000; // GitHub never returns more than 1000 search results

const quote = (value) => `"${value}"`;

/** Turns our filters into GitHub's search syntax. Exported so it can be unit tested. */
export function buildSearchQuery(f) {
  const parts = [];
  if (f.q) parts.push(f.q);
  parts.push('is:issue', 'is:open', 'is:public', 'archived:false');

  if (f.language) parts.push(`language:${quote(f.language)}`);
  if (f.repo) parts.push(`repo:${f.repo}`);
  if (f.org) parts.push(`org:${f.org}`);

  // A comma inside label:"a","b" means OR. Separate label: qualifiers mean AND.
  // "advanced" can't be expressed as a search, so it is filtered after fetching.
  if (f.difficulty && f.difficulty !== 'advanced') {
    parts.push(`label:${SEARCH_LABELS[f.difficulty].map(quote).join(',')}`);
  }
  if (f.goodFirstIssue) parts.push('label:"good first issue"');
  if (f.helpWanted) parts.push('label:"help wanted"');
  for (const label of f.labels ?? []) parts.push(`label:${quote(label)}`);

  return parts.join(' ');
}

export async function searchIssues(filters) {
  const q = buildSearchQuery(filters);
  const { data: result, stale } = await github.searchIssues({
    q,
    sort: filters.sort,
    page: filters.page,
    perPage: PER_PAGE,
  });

  // One lookup per distinct repo (cached 1h). If one fails we still show the issue, just without stars.
  const repoNames = [...new Set(result.items.map(repoFullNameOf))];
  const settled = await Promise.allSettled(repoNames.map((name) => github.getRepoInfo(name)));
  const repoInfo = new Map(
    repoNames.map((name, i) => [name, settled[i].status === 'fulfilled' ? settled[i].value : null]),
  );

  let items = result.items
    .filter((raw) => !raw.pull_request) // the issues endpoint can still contain PRs
    .map((raw) => withoutBody(fromGithub(raw, repoInfo.get(repoFullNameOf(raw)))));

  // Post-filters (GitHub search can't do these, see the notes in the UI)
  if (filters.difficulty === 'advanced') items = items.filter((i) => i.difficulty === 'advanced');
  if (filters.minStars) items = items.filter((i) => (i.stars ?? 0) >= filters.minStars);

  const totalAvailable = Math.min(result.total_count, GITHUB_MAX_RESULTS);
  return {
    items,
    pagination: {
      page: filters.page,
      perPage: PER_PAGE,
      totalCount: result.total_count,
      totalAvailable,
      totalPages: Math.ceil(totalAvailable / PER_PAGE),
    },
    stale,
  };
}