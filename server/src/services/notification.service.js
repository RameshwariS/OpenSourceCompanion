import Notification from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { emitToUser } from '../sockets/index.js';

// An explicit shape: `user` and `dedupeKey` never leave the server
export const toDTO = (n) => ({
  id: String(n._id),
  type: n.type,
  message: n.message,
  link: n.link,
  read: Boolean(n.readAt),
  createdAt: n.createdAt,
});

/**
 * The ONLY way notifications are created, and only server code calls it.
 * Returns null if this event was already notified (same dedupeKey).
 */
export async function notify(userId, { type, message, link = '', dedupeKey }) {
  let doc;
  try {
    doc = await Notification.create({ user: userId, type, message, link, dedupeKey });
  } catch (err) {
    if (err.code === 11000) return null;
    throw err;
  }
  emitToUser(userId, 'notification', toDTO(doc));
  return doc;
}

export const countUnread = (userId) => Notification.countDocuments({ user: userId, readAt: null });

export async function listNotifications(userId, { limit, unread }) {
  const filter = { user: userId };
  if (unread) filter.readAt = null;

  const [docs, unreadCount] = await Promise.all([
    // _id is the tie-breaker for notifications created in the same millisecond
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit).lean(),
    countUnread(userId),
  ]);
  return { items: docs.map(toDTO), unreadCount };
}

export async function markRead(userId, id) {
  // Filtering by user means someone else's notification looks like it doesn't exist
  const notification = await Notification.findOne({ _id: id, user: userId });
  if (!notification) throw new ApiError(404, 'Notification not found');

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }
  return { unreadCount: await countUnread(userId) };
}

export async function markAllRead(userId) {
  await Notification.updateMany({ readAt: null }, { $set: { readAt: new Date() } });
  return { unreadCount: 0 };
}