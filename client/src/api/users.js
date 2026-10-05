import { api } from './client';

export async function updateProfile(payload) {
  const res = await api.patch('/users/me', payload);
  return res.data.data.user;
}

export async function getProfile(username) {
  const res = await api.get(`/users/${encodeURIComponent(username)}`);
  return res.data.data; // { profile, isSelf, issuesTracked, github }
}