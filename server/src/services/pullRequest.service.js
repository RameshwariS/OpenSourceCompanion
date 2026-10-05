import { ApiError } from '../utils/ApiError.js';
import { cached, forget } from '../utils/cache.js';
import { repoFullNameOf } from '../utils/issueMapper.js';
import { getPullReviews, githubGet } from './github.service.js';

const PR_TTL_SECONDS = 15 * 60;
const MAX_REVIEW_LOOKUPS = 10;
const LOGIN_REGEX = /^[A-Za-z0-9-]{1,39}$/; // GitHub login rules. Also stops query injection.

const cacheKey = (login) => `gh:prs:v1:${login.toLowerCase()}`;
const isExternal = (pr, login) => pr.owner.toLowerCase() !== login.toLowerCase();

/** Raw GitHub search item -> small object. We cache these, so keep them slim. */
function slim(raw) {
  const repoFullName = repoFullNameOf(raw);
  const [owner, repo] = repoFullName.split('/');
  const mergedAt = raw.pull_request?.merged_at ?? null;
  return {
    githubId: raw.id,
    repoFullName,
    owner,
    repo,
    number: raw.number,
    title: raw.title,
    state: mergedAt ? 'merged' : raw.state, // 'open' | 'closed' | 'merged'
    draft: Boolean(raw.draft),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    closedAt: raw.closed_at ?? null,
    mergedAt,
    htmlUrl: raw.html_url,
  };
}

// 3 searches, cached together under ONE key so a manual refresh is one delete.
// `total_count` is exact even when we only receive the 100 most recent items.
async function loadSummary(login) {
  const base = `author:${login} is:pr is:public`;
  const search = (extra, perPage) =>
    githubGet('/search/issues', { q: `${base}${extra}`, sort: 'updated', order: 'desc', per_page: perPage, page: 1 });

  const [all, merged, open] = await Promise.all([search('', 100), search(' is:merged', 100), search(' is:open', 1)]);

  const total = all.total_count;
  return {
    stats: {
      total,
      merged: merged.total_count,
      open: open.total_count,
      closed: Math.max(0, total - merged.total_count - open.total_count),
    },
    items: all.items.map(slim),
    mergedItems: merged.items.map(slim),
  };
}

/** @returns {Promise<{ data: Awaited<ReturnType<typeof loadSummary>>, stale: boolean }>} */
export function getSummary(login) {
  if (!LOGIN_REGEX.test(login)) throw new ApiError(400, 'Invalid GitHub username');
  return cached(cacheKey(login), PR_TTL_SECONDS, () => loadSummary(login));
}

function requireGithubLogin(user) {
  const login = user.github?.username;
  if (!login) {
    throw new ApiError(400, 'Connect your GitHub account to track pull requests', { code: 'GITHUB_NOT_CONNECTED' });
  }
  return login;
}

/**
 * Review status of ONE PR from its list of reviews (oldest first).
 * Only the latest decisive review per reviewer counts; a dismissal clears it.
 * 'none' = nobody has approved or requested changes yet.
 */
export function summarizeReviews(reviews) {
  const latest = new Map();
  for (const review of reviews) {
    if (!['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) continue;
    latest.set(review.user?.login ?? 'ghost', review.state);
  }
  const states = [...latest.values()];
  if (states.includes('CHANGES_REQUESTED')) return 'changes_requested';
  if (states.includes('APPROVED')) return 'approved';
  return 'none';
}

export async function getMyPullRequests(user) {
  const { data, stale } = await getSummary(requireGithubLogin(user));

  // Review lookups cost one GitHub call each, so only open, non-draft PRs (max 10)
  const toReview = data.items.filter((pr) => pr.state === 'open' && !pr.draft).slice(0, MAX_REVIEW_LOOKUPS);
  const settled = await Promise.allSettled(toReview.map((pr) => getPullReviews(pr.owner, pr.repo, pr.number)));
  const reviewById = new Map(
    toReview.map((pr, i) => [pr.githubId, settled[i].status === 'fulfilled' ? summarizeReviews(settled[i].value.data) : null]),
  );

  return {
    items: data.items.map((pr) => ({ ...pr, reviewStatus: reviewById.get(pr.githubId) ?? null })),
    stats: data.stats,
    truncated: data.stats.total > data.items.length,
    stale,
  };
}

export async function getMyPullRequestStats(user) {
  const { data, stale } = await getSummary(requireGithubLogin(user));
  return { stats: data.stats, stale };
}

export function refreshMyPullRequests(user) {
  forget(cacheKey(requireGithubLogin(user)));
}

/** What the public profile needs. Contributions to your OWN repos are excluded. */
export async function getPublicPullRequestInfo(login) {
  const { data, stale } = await getSummary(login);
  const mergedExternal = data.mergedItems.filter((pr) => isExternal(pr, login));

  return {
    stats: data.stats,
    repositories: [...new Set(mergedExternal.map((pr) => pr.repoFullName))],
    recentMerged: mergedExternal.slice(0, 5),
    metrics: {
      mergedExternalPRs: mergedExternal.length,
      openedExternalPRs: data.items.filter((pr) => isExternal(pr, login)).length,
    },
    stale,
  };
}