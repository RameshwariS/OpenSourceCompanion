import Bookmark from '../models/Bookmark.js';
import { ApiError } from '../utils/ApiError.js';
import { fromSnapshot } from '../utils/issueMapper.js';
import { ensureSnapshot } from './snapshot.service.js';

const toDTO = (bookmark, issueDoc) => ({
  id: String(bookmark._id),
  createdAt: bookmark.createdAt,
  issue: fromSnapshot(issueDoc),
});

export async function createBookmark(userId, { repo, number }) {
  const issue = await ensureSnapshot(repo, number);
  try {
    const bookmark = await Bookmark.create({ user: userId, issue: issue._id });
    return toDTO(bookmark, issue);
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Issue is already bookmarked');
    throw err;
  }
}

export async function listBookmarks(userId, { sort, language, difficulty, q }) {
  const direction = sort === 'oldest' ? 1 : -1;
  const bookmarks = await Bookmark.find({ user: userId })
    .sort({ createdAt: direction, _id: direction })
    .limit(500) // a user's bookmark list is small; this is a safety cap
    .populate('issue');

  let items = bookmarks.filter((b) => b.issue).map((b) => toDTO(b, b.issue));

  // Difficulty is computed from labels (not stored), so these filters run in memory.
  if (language) items = items.filter((b) => b.issue.language?.toLowerCase() === language.toLowerCase());
  if (difficulty) items = items.filter((b) => b.issue.difficulty === difficulty);
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter(
      (b) => b.issue.title.toLowerCase().includes(needle) || b.issue.repoFullName.toLowerCase().includes(needle),
    );
  }
  return items;
}

export async function deleteBookmark(userId, id) {
  // Filtering by user means you can only delete YOUR bookmarks. Others get a 404.
  const deleted = await Bookmark.findOneAndDelete({ _id: id, user: userId });
  if (!deleted) throw new ApiError(404, 'Bookmark not found');
}