import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

const validUser = {
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  password: 'Password123',
};

const register = (body = validUser) => request(app).post('/api/auth/register').send(body);

describe('POST /api/auth/register', () => {
  it('creates a user, hides sensitive fields, and sets an httpOnly cookie', async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      email: 'test@example.com',
      username: 'testuser',
      role: 'contributor',
    });
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/osc_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    await register();
    const user = await User.findOne({ email: validUser.email }).select('+passwordHash');

    expect(user.passwordHash).not.toBe(validUser.password);
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('allows registering as a maintainer', async () => {
    const res = await register({ ...validUser, role: 'maintainer' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('maintainer');
  });

  it('refuses to let a user register as admin', async () => {
    const res = await register({ ...validUser, role: 'admin' });
    expect(res.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects a duplicate email (case-insensitive) with 409', async () => {
    await register();
    const res = await register({ ...validUser, username: 'other', email: 'TEST@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email/i);
  });

  it('rejects a duplicate username with 409', async () => {
    await register();
    const res = await register({ ...validUser, email: 'other@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/username/i);
  });

  it('rejects a weak password with 400', async () => {
    const res = await register({ ...validUser, password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0].field).toBe('password');
  });

  it('rejects an invalid email with 400', async () => {
    const res = await register({ ...validUser, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('rejects a NoSQL-injection payload instead of passing it to MongoDB', async () => {
    const res = await register({ ...validUser, email: { $gt: '' } });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  const login = (body) => request(app).post('/api/auth/login').send(body);

  it('logs in with correct credentials and sets a cookie', async () => {
    await register();
    const res = await login({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.headers['set-cookie'][0]).toMatch(/osc_token=/);
  });

  it('treats the email as case-insensitive', async () => {
    await register();
    const res = await login({ email: 'TEST@Example.com', password: validUser.password });
    expect(res.status).toBe(200);
  });

  it('returns 401 for a wrong password', async () => {
    await register();
    const res = await login({ email: validUser.email, password: 'WrongPassword1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns the SAME 401 message for an unknown email', async () => {
    const res = await login({ email: 'nobody@example.com', password: 'Password123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns 403 for a suspended user', async () => {
    await register();
    await User.updateOne({ email: validUser.email }, { status: 'suspended' });
    const res = await login({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(403);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await login({});
    expect(res.status).toBe(400);
  });
});

describe('session: GET /api/users/me and logout', () => {
  it('returns 401 without a cookie', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns the current user when the cookie is present', async () => {
    const agent = request.agent(app); // an agent remembers cookies like a browser
    await agent.post('/api/auth/register').send(validUser);

    const res = await agent.get('/api/users/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('rejects a tampered token', async () => {
    const res = await request(app).get('/api/users/me').set('Cookie', 'osc_token=abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('rejects a valid token once the user is suspended', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(validUser);
    await User.updateOne({ email: validUser.email }, { status: 'suspended' });

    const res = await agent.get('/api/users/me');
    expect(res.status).toBe(403);
  });

  it('logout clears the cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(validUser);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);

    const res = await agent.get('/api/users/me');
    expect(res.status).toBe(401);
  });
});