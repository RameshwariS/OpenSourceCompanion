import User from '../models/User.js';
import { notify } from '../services/notification.service.js';
import { getSummary } from '../services/pullRequest.service.js';

// Users are checked in batches (each check can cost 3 GitHub searches). A merge counts as "new"
// for 24 hours, which comfortably covers a full rotation for up to ~900 users.
const BATCH = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000;

let cursor = 0; // resets on server restart, which only means starting the rotation over
export const resetPullRequestCursor = () => {
  cursor = 0;
};

export async function checkMergedPullRequests(now = new Date()) {
  const users = await User.find({ status: 'active', 'github.username': { $exists: true, $ne: null } })
    .sort({ _id: 1 })
    .skip(cursor)
    .limit(BATCH)
    .select('github.username');
  cursor = users.length < BATCH ? 0 : cursor + BATCH;

  for (const user of users) {
    try {
      const { data } = await getSummary(user.github.username); // cached 15 min, shared with the profile page
      const recent = data.mergedItems.filter((pr) => now - Date.parse(pr.mergedAt) < WINDOW_MS);

      for (const pr of recent) {
        await notify(user._id, {
          type: 'pr_merged',
          message: `Your pull request was merged: ${pr.title.slice(0, 120)} (${pr.repoFullName}#${pr.number})`,
          link: `https://github.com/${pr.repoFullName}/pull/${pr.number}`,
          dedupeKey: `pr-merged:${pr.githubId}`,
        });
      }
    } catch (err) {
      console.error(`Merged PR check failed for ${user.github.username}:`, err.message);
    }
  }
}