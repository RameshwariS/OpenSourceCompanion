import crypto from 'node:crypto';
import { githubClient } from '../config/githubClient.js';
import { ApiError } from '../utils/ApiError.js';
import { cached } from '../utils/cache.js';

// Cache lifetimes (seconds). Search changes fast; repo stats barely move.
const TTL = { search: 600, repo: 3600, issue: 600, comments: 300 };

const seg = encodeURIComponent; // owner/repo are validated, but encode anyway

function mapGithubError(err) {
  if (err instanceof ApiError) return err;
  const res = err.response;
  if (!res) return new ApiError(502, 'Could not reach GitHub', { code: 'GITHUB_UNREACHABLE' });

  const message = String(res.data?.message ?? '');
  const rateLimited =
    res.status === 429 ||
    (res.status === 403 &&
      (res.headers?.['x-ratelimit-remaining'] === '0' ||
        Boolean(res.headers?.['retry-after']) ||
        /rate limit/i.test(message)));

  if (rateLimited) {
    return new ApiError(429, 'GitHub rate limit reached. Please try again in a minute.', { code: 'GITHUB_RATE_LIMITED' });
  }
  if (res.status === 404) return new ApiError(404, 'Not found on GitHub');
  if (res.status === 422) return new ApiError(400, 'GitHub could not run that search. Try fewer or simpler filters.');
  if (res.status === 401) {
    console.error('GITHUB_TOKEN was rejected by GitHub. Check server/.env');
    return new ApiError(502, 'GitHub credentials on the server are invalid');
  }
  return new ApiError(502, 'GitHub request failed');
}

async function githubGet(url, params) {
  try {
    const res = await githubClient.get(url, { params });
    return res.data;
  } catch (err) {
    throw mapGithubError(err);
  }
}

const hash = (value) => crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex');

/** @returns {Promise<{ data: {total_count:number, items:object[]}, stale: boolean }>} */
export function searchIssues({ q, sort, page, perPage }) {
  return cached(`gh:search:v1:${hash({ q, sort, page, perPage })}`, TTL.search, () =>
    githubGet('/search/issues', { q, sort, order: 'desc', per_page: perPage, page }),
  );
}

/** Issue search results don't include stars/language, so we look the repo up (cached 1h). */
export async function getRepoInfo(repoFullName) {
  const [owner, repo] = repoFullName.split('/');
  const { data } = await cached(`gh:repo:v1:${repoFullName.toLowerCase()}`, TTL.repo, async () => {
    const r = await githubGet(`/repos/${seg(owner)}/${seg(repo)}`);
    return { stars: r.stargazers_count, language: r.language };
  });
  return data;
}

export function getIssue(owner, repo, number) {
  return cached(`gh:issue:v1:${owner}/${repo}#${number}`.toLowerCase(), TTL.issue, () =>
    githubGet(`/repos/${seg(owner)}/${seg(repo)}/issues/${number}`),
  );
}

export function getIssueComments(owner, repo, number) {
  return cached(`gh:comments:v1:${owner}/${repo}#${number}`.toLowerCase(), TTL.comments, () =>
    githubGet(`/repos/${seg(owner)}/${seg(repo)}/issues/${number}/comments`, { per_page: 10 }),
  );
}