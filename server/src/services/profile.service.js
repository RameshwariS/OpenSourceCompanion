import Contribution from '../models/Contribution.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { getStreaks } from './activity.service.js';
import { computeBadges } from './badge.service.js';
import { getPublicPullRequestInfo } from './pullRequest.service.js';

export async function updateProfile(user, changes) {
  // `changes` only contains fields the validator allow-listed (zod strips everything else)
  Object.assign(user, changes);
  await user.save();
  return user;
}

// An explicit ALLOW-LIST. A new field added to User later stays private until added here.
// (We deliberately do NOT reuse User.toJSON(): it would include email.)
const toPublicUser = (user) => ({
  username: user.username,
  name: user.name,
  bio: user.bio,
  skills: user.skills,
  location: user.location,
  portfolioUrl: user.portfolioUrl,
  linkedinUrl: user.linkedinUrl,
  role: user.role,
  avatarUrl: user.github?.avatarUrl ?? null,
  githubUsername: user.github?.username ?? null,
  joinedAt: user.createdAt,
});

async function loadGithubSection(user) {
  const login = user.github?.username;
  if (!login) return { connected: false };

  const [prs, streak] = await Promise.allSettled([getPublicPullRequestInfo(login), getStreaks(login)]);

  // GitHub rate-limited or down: still show the rest of the profile
  if (prs.status === 'rejected') return { connected: true, available: false };

  const streaks = streak.status === 'fulfilled' ? streak.value : null;
  return {
    connected: true,
    available: true,
    username: login,
    pullRequests: prs.value.stats,
    repositories: prs.value.repositories,
    recentMerged: prs.value.recentMerged,
    streak: streaks,
    badges: computeBadges({ ...prs.value.metrics, longestStreak: streaks?.longest ?? 0 }),
    stale: prs.value.stale,
  };
}

export async function getPublicProfile(username, viewerId) {
  // Suspended users look like they don't exist
  const user = await User.findOne({ username, status: 'active' });
  if (!user) throw new ApiError(404, 'User not found');

  const [issuesTracked, github] = await Promise.all([
    Contribution.countDocuments({ user: user._id }),
    loadGithubSection(user),
  ]);

  return { profile: toPublicUser(user), isSelf: user._id.equals(viewerId), issuesTracked, github };
}