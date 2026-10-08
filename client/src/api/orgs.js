import { api } from './client';

export async function getFollowedOrgs() {
  const res = await api.get('/orgs/following');
  return res.data.data.follows;
}

export async function followOrg(org) {
  const res = await api.post('/orgs/following', { org });
  return res.data.data.follow;
}

export async function unfollowOrg(org) {
  await api.delete(`/orgs/following/${encodeURIComponent(org)}`);
}