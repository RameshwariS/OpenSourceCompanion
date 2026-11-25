import { api } from './client';
export async function getAIKey() { return (await api.get('/ai/key')).data.data; }
export async function saveAIKey(payload) { return (await api.put('/ai/key', payload)).data.data; }
export async function deleteAIKey() { return (await api.delete('/ai/key')).data.data; }
export async function summarizeIssue({ owner, repo, number }) { return (await api.post(`/ai/issues/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${number}/summary`)).data.data; }
export async function askAI(payload) { return (await api.post('/ai/chat', payload)).data.data; }
