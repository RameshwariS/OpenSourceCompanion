import { api } from './client';

export async function getBookmarks(params) {
  const res = await api.get('/bookmarks', { params });
  return res.data.data.bookmarks;
}

export async function addBookmark({ repo, number }) {
  const res = await api.post('/bookmarks', { repo, number });
  return res.data.data.bookmark;
}

export async function removeBookmark(id) {
  await api.delete(`/bookmarks/${id}`);
}