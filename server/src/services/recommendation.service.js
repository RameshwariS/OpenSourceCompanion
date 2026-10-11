import { languageForSkill } from '../constants/languages.js';
import Bookmark from '../models/Bookmark.js';
import Contribution from '../models/Contribution.js';
import Issue from '../models/Issue.js';
import * as issueService from './issue.service.js';
import { attachUserState } from './issueState.service.js';
import { rankIssues, WEIGHTS } from './recommendationScoring.js';

const MAX_LANGUAGE_SEARCHES = 3;
const MAX_SKILL_SEARCHES = 2; // 5 GitHub searches at most per feed (each one cached for 10 minutes)

const unique = (list) => {
  const seen = new Set();
  return list.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// A skill becomes free text inside a GitHub search query, so strip anything that could add an
// operator (org:, repo:, quotes) and quote the rest.
const toSearchTerm = (skill) => skill.replace(/["\\:]/g, ' ').replace(/\s+/g, ' ').trim();

/** Languages of the issues this user tracked or bookmarked, most frequent first (top 3). */
async function activityLanguages(userId) {
  const [tracked, bookmarked] = await Promise.all([
    Contribution.distinct('issue', { user: userId }),
    Bookmark.distinct('issue', { user: userId }),
  ]);
  const ids = [...tracked, ...bookmarked];
  if (ids.length === 0) return [];

  const rows = await Issue.aggregate([
    { $match: { _id: { $in: ids }, language: { $ne: null } } },
    { $group: { _id: '$language', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 3 },
  ]);
  return rows.map((r) => r._id);
}

async function buildProfile(user) {
  const skills = user.skills ?? [];
  return {
    languages: unique(skills.map(languageForSkill).filter(Boolean)),
    skillTerms: skills.filter((s) => !languageForSkill(s)),
    activityLanguages: await activityLanguages(user._id),
  };
}

function planSearches(profile) {
  const languages = unique([...profile.languages, ...profile.activityLanguages]).slice(0, MAX_LANGUAGE_SEARCHES);
  const terms = profile.skillTerms.map(toSearchTerm).filter(Boolean).slice(0, MAX_SKILL_SEARCHES);

  const searches = [
    ...languages.map((language) => ({ label: language, filters: { language } })),
    ...terms.map((term) => ({ label: term, filters: { q: `"${term}"` } })),
  ];
  // Nothing to personalize with yet: fall back to a general beginner feed
  return searches.length > 0
    ? { searches, fallback: false }
    : { searches: [{ label: null, filters: {} }], fallback: true };
}

export async function getRecommendedIssues(user, { limit }) {
  const profile = await buildProfile(user);
  const { searches, fallback } = planSearches(profile);

  const settled = await Promise.allSettled(
    searches.map((s) => issueService.searchIssues({ ...s.filters, difficulty: 'beginner', sort: 'updated', page: 1 })),
  );
  const succeeded = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (succeeded.length === 0) throw settled[0].reason; // e.g. a rate limit: let the error handler answer

  // The same issue can come back from several searches
  const candidates = new Map();
  for (const result of succeeded) {
    for (const issue of result.items) if (!candidates.has(issue.githubId)) candidates.set(issue.githubId, issue);
  }

  const ranked = rankIssues([...candidates.values()], profile);
  const withState = await attachUserState(user._id, ranked); // keeps score and reasons
  const items = withState.filter((issue) => !issue.contribution).slice(0, limit);

  return {
    items,
    basedOn: fallback ? [] : searches.map((s) => s.label),
    fallback,
    partial: succeeded.length < settled.length,
    stale: succeeded.some((r) => r.stale),
    weights: WEIGHTS,
  };
}