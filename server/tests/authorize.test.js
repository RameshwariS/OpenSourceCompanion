import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import User from '../src/models/User.js';
import { authenticate, authorize } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { signAuthToken, AUTH_COOKIE } from '../src/utils/token.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

// A tiny app with one admin-only route, so we test the middleware in isolation
const testApp = express();
testApp.use(cookieParser());
testApp.get('/admin-only', authenticate, authorize('admin'), (req, res) => res.json({ success: true }));
testApp.use(errorHandler);

async function createUserWithToken(role) {
  const user = await User.create({
    email: `${role}@example.com`,
    username: role,
    name: role,
    role,
    passwordHash: 'not-used-here',
  });
  return { user, cookie: `${AUTH_COOKIE}=${signAuthToken(user._id)}` };
}

describe('authorize middleware', () => {
  it('returns 401 when not logged in', async () => {
    const res = await request(testApp).get('/admin-only');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a contributor', async () => {
    const { cookie } = await createUserWithToken('contributor');
    const res = await request(testApp).get('/admin-only').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('allows an admin', async () => {
    const { cookie } = await createUserWithToken('admin');
    const res = await request(testApp).get('/admin-only').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  it('applies a role change immediately, even with an old token', async () => {
    const { user, cookie } = await createUserWithToken('admin');
    await User.updateOne({ _id: user._id }, { role: 'contributor' });

    const res = await request(testApp).get('/admin-only').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });
});