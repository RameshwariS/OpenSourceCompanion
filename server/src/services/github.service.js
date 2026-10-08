import crypto from 'node:crypto';
import { githubClient } from '../config/githubClient.js';
import { ApiError } from '../utils/ApiError.js';
import { cached } from '../utils/cache.js';

// Cache lifetimes (seconds). Search changes fast; repo stats barely move.
const TTL = { search: 600, repo: 3600, issue: 600, comments: 300, reviews: 900, events: 3600, activity: 600, languages: 3600 };
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

export async function githubGet(url, params) {
  try {
    const res = await githubClient.get(url, { params });
    return res.data;
  } catch (err) {
    throw mapGithubError(err);
  }
}

export function getPullReviews(owner, repo, number) {
  return cached(`gh:reviews:v1:${owner}/${repo}#${number}`.toLowerCase(), TTL.reviews, () =>
    githubGet(`/repos/${seg(owner)}/${seg(repo)}/pulls/${number}/reviews`, { per_page: 100 }),
  );
}

export function getUserEvents(login) {
  return cached(`gh:events:v1:${login.toLowerCase()}`, TTL.events, async () => {
    const pages = await Promise.all(
      [1, 2, 3].map((page) => githubGet(`/users/${seg(login)}/events/public`, { per_page: 100, page })),
    );
    return pages.flat();
  });
}

const hash = (value) => crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex');

/** @returns {Promise<{ data: {total_count:number, items:object[]}, stale: boolean }>} */
export function searchIssues({ q, sort, page, perPage }) {
  return cached(`gh:search:v1:${hash({ q, sort, page, perPage })}`, TTL.search, () =>
    githubGet('/search/issues', { q, sort, order: 'desc', per_page: perPage, page }),
  );
}

// Keep only what we use. Cached objects stay small.
const slimRepo = (r) => ({
  fullName: r.full_name,
  name: r.name,
  description: r.description ?? '',
  language: r.language ?? null,
  topics: r.topics ?? [],
  stars: r.stargazers_count ?? 0,
  forks: r.forks_count ?? 0,
  archived: Boolean(r.archived),
  license: r.license?.spdx_id ?? null,
  ownerId: r.owner?.id ?? null,
  ownerLogin: r.owner?.login ?? null,
  ownerType: r.owner?.type ?? null,
  ownerAvatarUrl: r.owner?.avatar_url ?? null,
});

export function getRepository(owner, repo) {
  return cached(`gh:repo:v1:${owner}/${repo}`.toLowerCase(), TTL.repo, async () =>
    slimRepo(await githubGet(`/repos/${seg(owner)}/${seg(repo)}`)),
  );
}

/** Issue search results don't include stars/language, so we look the repo up (cached 1h). */
export async function getRepoInfo(repoFullName) {
  const [owner, repo] = repoFullName.split('/');
  const { data } = await getRepository(owner, repo);
  return { stars: data.stars, language: data.language };
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

// Like githubGet, but returns the whole response so callers can read headers.
async function githubGetFull(url, params) {
  try {
    return await githubClient.get(url, { params });
  } catch (err) {
    throw mapGithubError(err);
  }
}

/** '<...&page=2>; rel="next", <...&page=87>; rel="last"' -> 87 */
export function parseLastPage(linkHeader) {
  const match = /<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/.exec(linkHeader ?? '');
  return match ? Number(match[1]) : null;
}

/**
 * GitHub has no "count contributors" endpoint. We ask for ONE contributor per page,
 * so the number of the last page equals the number of contributors.
 */
export function getContributorCount(owner, repo) {
  return cached(`gh:contributors:v1:${owner}/${repo}`.toLowerCase(), TTL.repo, async () => {
    const res = await githubGetFull(`/repos/${seg(owner)}/${seg(repo)}/contributors`, { per_page: 1 });
    const last = parseLastPage(res.headers?.link);
    if (last) return last;
    return Array.isArray(res.data) ? res.data.length : 0; // no Link header = 0 or 1 contributors
  });
}

export function getRepoLanguages(owner, repo) {
  return cached(`gh:languages:v1:${owner}/${repo}`.toLowerCase(), TTL.languages, () =>
    githubGet(`/repos/${seg(owner)}/${seg(repo)}/languages`),
  );
}

export function getRepoEvents(owner, repo) {
  return cached(`gh:repoevents:v1:${owner}/${repo}`.toLowerCase(), TTL.activity, () =>
    githubGet(`/repos/${seg(owner)}/${seg(repo)}/events`, { per_page: 50 }),
  );
}

/** 204 = public member, 404 = not a (public) member. Short TTL so fixing your org settings works quickly. */
export function isPublicOrgMember(org, login) {
  return cached(`gh:orgmember:v1:${org}/${login}`.toLowerCase(), 300, async () => {
    try {
      await githubClient.get(`/orgs/${seg(org)}/public_members/${seg(login)}`);
      return true;
    } catch (err) {
      if (err.response?.status === 404) return false;
      throw mapGithubError(err);
    }
  }).then((r) => r.data);
}

/** Organizations only: GitHub returns 404 for personal accounts on this endpoint. */
export function getOrganization(org) {
  return cached(`gh:org:v1:${org}`.toLowerCase(), TTL.repo, async () => {
    const o = await githubGet(`/orgs/${seg(org)}`);
    return { login: o.login, name: o.name ?? o.login, avatarUrl: o.avatar_url ?? null };
  });
}
