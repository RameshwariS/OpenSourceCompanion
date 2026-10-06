import { api } from './client';

export async function getProjects(params) {
  const res = await api.get('/projects', { params });
  return res.data.data; // { items, pagination }
}

export async function getProject(id) {
  const res = await api.get(`/projects/${id}`);
  return res.data.data; // { project, languages, beginnerIssues, helpWantedIssues, recentActivity, canManage, stale }
}

export async function registerProject(repo) {
  const res = await api.post('/projects', { repo });
  return res.data.data.project;
}

export async function updateProject({ id, ...changes }) {
  const res = await api.patch(`/projects/${id}`, changes);
  return res.data.data.project;
}

export async function deleteProject(id) {
  await api.delete(`/projects/${id}`);
}

export async function followProject(id) {
  const res = await api.post(`/projects/${id}/follow`);
  return res.data.data;
}

export async function unfollowProject(id) {
  const res = await api.delete(`/projects/${id}/follow`);
  return res.data.data;
}