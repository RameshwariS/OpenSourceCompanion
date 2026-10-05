import Bookmark from '../models/Bookmark.js';
import Contribution from '../models/Contribution.js';
import Issue from '../models/Issue.js';

/**
 * Adds "has THIS user bookmarked/tracked it?" to GitHub issues.
 * Two small indexed queries for a whole page, never one query per issue.
 */
export async function attachUserState(userId, issues) {
  if (issues.length === 0) return issues;

  const snapshots = await Issue.find({ githubId: { $in: issues.map((i) => i.githubId) } })
    .select('_id githubId')
    .lean();
  const snapshotIdByGithubId = new Map(snapshots.map((s) => [s.githubId, String(s._id)]));
  const snapshotIds = snapshots.map((s) => s._id);

  const [bookmarks, contributions] = await Promise.all([
    Bookmark.find({ user: userId, issue: { $in: snapshotIds } }).select('issue').lean(),
    Contribution.find({ user: userId, issue: { $in: snapshotIds } }).select('issue status').lean(),
  ]);

  const bookmarkIdByIssue = new Map(bookmarks.map((b) => [String(b.issue), String(b._id)]));
  const contributionByIssue = new Map(
    contributions.map((c) => [String(c.issue), { id: String(c._id), status: c.status }]),
  );

  return issues.map((issue) => {
    const snapshotId = snapshotIdByGithubId.get(issue.githubId);
    return {
      ...issue,
      bookmarkId: bookmarkIdByIssue.get(snapshotId) ?? null,
      contribution: contributionByIssue.get(snapshotId) ?? null,
    };
  });
}