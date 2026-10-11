import { api } from './client';

export async function searchIssues(params) {
  const res = await api.get('/issues', { params });
  return res.data.data; // { items, pagination, stale }
}

export async function getIssue({ owner, repo, number }) {
  const res = await api.get(`/issues/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${number}`);
  return res.data.data; // { issue, comments, stale }
}
export async function getRecommended(limit) {
  const res = await api.get('/issues/recommended', { params: { limit } });
  return res.data.data; // { items, basedOn, fallback, partial, stale, weights }
}