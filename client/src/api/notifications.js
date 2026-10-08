import { api } from './client';

export async function getNotifications(params) {
  const res = await api.get('/notifications', { params });
  return res.data.data; // { items, unreadCount }
}

export async function markRead(id) {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data.data;
}

export async function markAllRead() {
  const res = await api.patch('/notifications/read-all');
  return res.data.data;
}