import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Notification from '../src/models/Notification.js';
import { notify } from '../src/services/notification.service.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

let seq = 0;
const make = (user, over = {}) =>
  Notification.create({ user, type: 'org_issue', message: 'New issue', dedupeKey: `key-${++seq}`, ...over });

describe('GET /api/notifications', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/notifications')).status).toBe(401);
  });

  it('lists only your notifications, newest first, with the unread count', async () => {
    const me = await createAgent();
    const other = await createAgent();
    await make(me.user.id, { message: 'first' });
    await make(me.user.id, { message: 'second', readAt: new Date() });
    await make(me.user.id, { message: 'third' });
    await make(other.user.id, { message: 'not mine' });

    const res = await me.agent.get('/api/notifications');

    expect(res.status).toBe(200);
    expect(res.body.data.items.map((n) => n.message)).toEqual(['third', 'second', 'first']);
    expect(res.body.data.items.map((n) => n.read)).toEqual([false, true, false]);
    expect(res.body.data.unreadCount).toBe(2);
  });

  it('can list only unread notifications', async () => {
    const { agent, user } = await createAgent();
    await make(user.id, { message: 'old', readAt: new Date() });
    await make(user.id, { message: 'new' });

    const res = await agent.get('/api/notifications?unread=true');
    expect(res.body.data.items.map((n) => n.message)).toEqual(['new']);
  });

  it('does not expose internal fields', async () => {
    const { agent, user } = await createAgent();
    await make(user.id);

    const raw = JSON.stringify((await agent.get('/api/notifications')).body);
    expect(raw).not.toContain('dedupeKey');
    expect(raw).not.toContain(user.id);
  });

  it.each([['limit=0'], ['limit=51'], ['unread=maybe']])('rejects invalid input: %s', async (qs) => {
    const { agent } = await createAgent();
    expect((await agent.get(`/api/notifications?${qs}`)).status).toBe(400);
  });
});

describe('GET /api/notifications/unread-count', () => {
  it('counts only your unread notifications', async () => {
    const me = await createAgent();
    const other = await createAgent();
    await make(me.user.id);
    await make(me.user.id, { readAt: new Date() });
    await make(other.user.id);

    const res = await me.agent.get('/api/notifications/unread-count');
    expect(res.body.data).toEqual({ unreadCount: 1 });
  });
});

describe('PATCH /api/notifications/:id/read', () => {
  it('marks your notification as read, and is idempotent', async () => {
    const { agent, user } = await createAgent();
    const n = await make(user.id);

    const first = await agent.patch(`/api/notifications/${n.id}/read`);
    const readAt = (await Notification.findById(n.id)).readAt;
    const second = await agent.patch(`/api/notifications/${n.id}/read`);

    expect(first.status).toBe(200);
    expect(first.body.data).toEqual({ unreadCount: 0 });
    expect(second.status).toBe(200);
    expect((await Notification.findById(n.id)).readAt).toEqual(readAt);
  });

  it('returns 404 for someone else\'s notification and leaves it unread', async () => {
    const owner = await createAgent();
    const intruder = await createAgent();
    const n = await make(owner.user.id);

    expect((await intruder.agent.patch(`/api/notifications/${n.id}/read`)).status).toBe(404);
    expect((await Notification.findById(n.id)).readAt).toBeNull();
  });

  it('returns 400 for a malformed id', async () => {
    const { agent } = await createAgent();
    expect((await agent.patch('/api/notifications/nope/read')).status).toBe(400);
  });
});

describe('PATCH /api/notifications/read-all', () => {
  it('marks only YOUR notifications as read', async () => {
    const me = await createAgent();
    const other = await createAgent();
    await make(me.user.id);
    await make(me.user.id);
    const theirs = await make(other.user.id);

    const res = await me.agent.patch('/api/notifications/read-all');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ unreadCount: 0 });
    expect(await Notification.countDocuments({ user: me.user.id, readAt: null })).toBe(0);
    expect((await Notification.findById(theirs.id)).readAt).toBeNull();
  });
});

describe('notify()', () => {
  it('creates one notification per event, even when called twice', async () => {
    const { user } = await createAgent();
    const event = { type: 'pr_merged', message: 'Merged!', dedupeKey: 'pr-merged:1' };

    expect(await notify(user.id, event)).not.toBeNull();
    expect(await notify(user.id, event)).toBeNull();
    expect(await Notification.countDocuments()).toBe(1);
  });

  it('lets two different users be notified about the same event', async () => {
    const one = await createAgent();
    const two = await createAgent();
    const event = { type: 'issue_closed', message: 'Closed', dedupeKey: 'issue-closed:1' };

    await notify(one.user.id, event);
    await notify(two.user.id, event);
    expect(await Notification.countDocuments()).toBe(2);
  });
});