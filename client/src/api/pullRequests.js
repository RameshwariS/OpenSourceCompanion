import { api } from './client';

export async function getPullRequests() {
  const res = await api.get('/pull-requests');
  return res.data.data; // { items, stats, truncated, stale }
}

export async function refreshPullRequests() {
  await api.post('/pull-requests/refresh');
}