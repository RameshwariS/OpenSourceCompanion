import { api } from './client';

export async function getContributions() {
  const res = await api.get('/contributions');
  return res.data.data.contributions;
}

export async function getContributionStats() {
  const res = await api.get('/contributions/stats');
  return res.data.data.stats;
}

export async function trackIssue({ repo, number }) {
  const res = await api.post('/contributions', { repo, number });
  return res.data.data.contribution;
}

export async function updateContribution({ id, ...changes }) {
  const res = await api.patch(`/contributions/${id}`, changes);
  return res.data.data.contribution;
}

export async function removeContribution(id) {
  await api.delete(`/contributions/${id}`);
}