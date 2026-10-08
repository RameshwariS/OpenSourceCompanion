import * as service from '../services/notification.service.js';

export async function list(req, res) {
  const data = await service.listNotifications(req.user._id, req.validated.query);
  res.status(200).json({ success: true, data, message: 'Notifications retrieved' });
}

export async function unreadCount(req, res) {
  const count = await service.countUnread(req.user._id);
  res.status(200).json({ success: true, data: { unreadCount: count }, message: 'Unread count' });
}

export async function read(req, res) {
  const data = await service.markRead(req.user._id, req.validated.params.id);
  res.status(200).json({ success: true, data, message: 'Marked as read' });
}

export async function readAll(req, res) {
  const data = await service.markAllRead(req.user._id);
  res.status(200).json({ success: true, data, message: 'All notifications marked as read' });
}