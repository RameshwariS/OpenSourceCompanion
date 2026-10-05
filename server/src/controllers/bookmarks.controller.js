import * as bookmarkService from '../services/bookmark.service.js';

export async function create(req, res) {
  const bookmark = await bookmarkService.createBookmark(req.user._id, req.validated.body);
  res.status(201).json({ success: true, data: { bookmark }, message: 'Issue bookmarked' });
}

export async function list(req, res) {
  const bookmarks = await bookmarkService.listBookmarks(req.user._id, req.validated.query);
  res.status(200).json({ success: true, data: { bookmarks }, message: 'Bookmarks retrieved' });
}

export async function remove(req, res) {
  await bookmarkService.deleteBookmark(req.user._id, req.validated.params.id);
  res.status(200).json({ success: true, data: null, message: 'Bookmark removed' });
}