import Project from '../models/Project.js';
import ProjectFollow from '../models/ProjectFollow.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { languageBreakdown, mapEvents, repoToFields, toProjectDTO } from '../utils/projectMapper.js';
import * as github from './github.service.js';
import * as issueService from './issue.service.js';
import { attachUserState } from './issueState.service.js';
import Opportunity from '../models/Opportunity.js';
import { isProjectManager as isManager } from '../utils/permissions.js';

export const PER_PAGE = 12;
const MAX_PROJECTS_PER_USER = 20;
const RESYNC_AFTER_MS = 5 * 60 * 1000; // don't write to Mongo on every page view
const SHOWN_ISSUES = 10;

// _id is the tie-breaker so pagination never repeats or skips items
const SORTS = {
  stars: { stars: -1, _id: -1 },
  newest: { createdAt: -1, _id: -1 },
  beginner: { beginnerIssueCount: -1, stars: -1, _id: -1 },
};


const definedOnly = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
const totalOf = (settled) => (settled.status === 'fulfilled' ? settled.value.pagination.totalCount : undefined);
const dataOf = (settled) => (settled.status === 'fulfilled' ? settled.value.data : undefined);

// The two issue searches double as our counters: GitHub returns total_count with the first page.
const issueSearches = (repoFullName) => [
  issueService.searchIssues({ repo: repoFullName, difficulty: 'beginner', sort: 'updated', page: 1 }),
  issueService.searchIssues({ repo: repoFullName, helpWanted: true, sort: 'updated', page: 1 }),
];

/** [beginnerSearch, helpWantedSearch, contributors] (all settled) -> counts we can store. */
const countFields = ([beginner, helpWanted, contributors]) =>
  definedOnly({
    beginnerIssueCount: totalOf(beginner),
    helpWantedIssueCount: totalOf(helpWanted),
    contributorsCount: dataOf(contributors),
  });

async function followState(userId, projectId) {
  const [followersCount, mine] = await Promise.all([
    ProjectFollow.countDocuments({ project: projectId }),
    ProjectFollow.exists({ user: userId, project: projectId }),
  ]);
  return { followersCount, isFollowing: Boolean(mine) };
}

/** Verified = you own the repo (matched by numeric GitHub id), or publicly belong to its organization. */
async function isRepoOwner(user, repo) {
  const githubId = user.github?.id;
  const login = user.github?.username;
  if (!githubId || !login) return false;
  if (repo.ownerId === githubId) return true;
  if (repo.ownerType === 'Organization') {
    try {
      return await github.isPublicOrgMember(repo.ownerLogin, login);
    } catch {
      return false; // GitHub hiccup: list it as unverified rather than failing the request
    }
  }
  return false;
}

export async function registerProject(user, repoFullName) {
  if (user.role !== 'admin' && (await Project.countDocuments({ owner: user._id })) >= MAX_PROJECTS_PER_USER) {
    throw new ApiError(403, `You can list at most ${MAX_PROJECTS_PER_USER} projects`);
  }

  const [ownerName, repoName] = repoFullName.split('/');
  const { data: repo } = await github.getRepository(ownerName, repoName); // 404 -> "Not found on GitHub"
  if (repo.archived) {
    throw new ApiError(400, 'Archived repositories cannot be listed because they no longer accept contributions');
  }

  const [canonicalOwner, canonicalName] = repo.fullName.split('/');
  const [verified, counts] = await Promise.all([
    isRepoOwner(user, repo),
    Promise.allSettled([...issueSearches(repo.fullName), github.getContributorCount(canonicalOwner, canonicalName)]),
  ]);

  const fields = { ...repoToFields(repo), ...countFields(counts) };

  try {
    const project = await Project.create({ owner: user._id, verified, ...fields });
    return toProjectDTO(project.toObject());
  } catch (err) {
    if (err.code !== 11000) throw err;

    // Already listed. An UNVERIFIED listing can be taken over by someone who verifies
    // (stops squatting). A verified listing is never taken.
    const existing = await Project.findOne({ repoKey: fields.repoKey });
    if (existing && !existing.verified && verified) {
      existing.set({ owner: user._id, verified: true, ...fields });
      await existing.save();
      return toProjectDTO(existing.toObject(), await followState(user._id, existing._id));
    }
    throw new ApiError(409, 'This repository is already listed');
  }
}

export async function listProjects(user, { q, language, topic, following, sort, page }) {
  const filter = {};
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ repoFullName: pattern }, { description: pattern }, { topics: pattern }];
  }
  if (language) filter.language = language; // exact match, so the {language, stars} index is used
  if (topic) filter.topics = topic;
  if (following) filter._id = { $in: await ProjectFollow.distinct('project', { user: user._id }) };

  const [docs, totalCount] = await Promise.all([
    Project.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .lean(),
    Project.countDocuments(filter),
  ]);

  // Two small queries for the whole page, never one per card
  const ids = docs.map((d) => d._id);
  const [counts, mine] = await Promise.all([
    ProjectFollow.aggregate([
      { $match: { project: { $in: ids } } },
      { $group: { _id: '$project', count: { $sum: 1 } } },
    ]),
    ProjectFollow.find({ user: user._id, project: { $in: ids } }).select('project').lean(),
  ]);
  const countById = new Map(counts.map((c) => [String(c._id), c.count]));
  const followed = new Set(mine.map((f) => String(f.project)));

  return {
    items: docs.map((d) =>
      toProjectDTO(d, { followersCount: countById.get(String(d._id)) ?? 0, isFollowing: followed.has(String(d._id)) }),
    ),
    pagination: { page, perPage: PER_PAGE, totalCount, totalPages: Math.ceil(totalCount / PER_PAGE) },
  };
}

export async function getProjectDetail(user, id) {
  const stored = await Project.findById(id).populate('owner', 'username name');
  if (!stored) throw new ApiError(404, 'Project not found');

  const [ownerName, repoName] = stored.repoFullName.split('/');

  // Every section loads independently: one GitHub failure must not break the page.
  const [repoR, languagesR, eventsR, beginnerR, helpR, contributorsR] = await Promise.allSettled([
    github.getRepository(ownerName, repoName),
    github.getRepoLanguages(ownerName, repoName),
    github.getRepoEvents(ownerName, repoName),
    ...issueSearches(stored.repoFullName),
    github.getContributorCount(ownerName, repoName),
  ]);

  // Show live values when we have them; persist them at most every few minutes.
  const repo = dataOf(repoR);
  const live = { ...(repo ? repoToFields(repo) : {}), ...countFields([beginnerR, helpR, contributorsR]) };
  const lastSynced = stored.lastSyncedAt ? stored.lastSyncedAt.getTime() : 0;

  let current = { ...stored.toObject(), ...live };
  if (repo && Date.now() - lastSynced > RESYNC_AFTER_MS) {
    try {
      await Project.updateOne({ _id: stored._id }, { $set: live });
    } catch (err) {
      if (err.code !== 11000) throw err; // repo was renamed to a name another project already uses: show it, don't save it
    }
  }

  const beginner = beginnerR.status === 'fulfilled' ? beginnerR.value.items.slice(0, SHOWN_ISSUES) : null;
  const helpWanted = helpR.status === 'fulfilled' ? helpR.value.items.slice(0, SHOWN_ISSUES) : null;

  // One state lookup (bookmarks/tracking) for both lists together
  const withState = await attachUserState(user._id, [...(beginner ?? []), ...(helpWanted ?? [])]);

  const settled = [repoR, languagesR, eventsR, beginnerR, helpR, contributorsR];
  const stale = !repo || settled.some((r) => r.status === 'fulfilled' && r.value?.stale);

  return {
    project: toProjectDTO(current, await followState(user._id, stored._id)),
    languages: languagesR.status === 'fulfilled' ? languageBreakdown(languagesR.value.data) : null,
    recentActivity: eventsR.status === 'fulfilled' ? mapEvents(eventsR.value.data, current.repoFullName) : null,
    beginnerIssues: beginner && withState.slice(0, beginner.length),
    helpWantedIssues: helpWanted && withState.slice(beginner?.length ?? 0),
    canManage: isManager(user, current),
    stale,
  };
}

async function loadManageable(user, id) {
  const project = await Project.findById(id);
  if (!project) throw new ApiError(404, 'Project not found');
  if (!isManager(user, project)) throw new ApiError(403, 'Only the project owner can do this');
  return project;
}

export async function updateProject(user, id, changes) {
  const project = await loadManageable(user, id);
  project.set(changes); // validator allow-lists: summary, contributingUrl
  await project.save();
  return toProjectDTO(project.toObject(), await followState(user._id, project._id));
}

export async function deleteProject(user, id) {
  const project = await loadManageable(user, id);
  await Project.deleteOne({ _id: project._id });
  await ProjectFollow.deleteMany({ project: project._id });
  await Opportunity.deleteMany({ project: project._id });
}

export async function followProject(userId, projectId) {
  if (!(await Project.exists({ _id: projectId }))) throw new ApiError(404, 'Project not found');
  try {
    await ProjectFollow.create({ user: userId, project: projectId });
  } catch (err) {
    if (err.code !== 11000) throw err; // already following: that's fine, following is idempotent
  }
  return { following: true, followersCount: await ProjectFollow.countDocuments({ project: projectId }) };
}

export async function unfollowProject(userId, projectId) {
  if (!(await Project.exists({ _id: projectId }))) throw new ApiError(404, 'Project not found');
  await ProjectFollow.deleteOne({ user: userId, project: projectId });
  return { following: false, followersCount: await ProjectFollow.countDocuments({ project: projectId }) };
}