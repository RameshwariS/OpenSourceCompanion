import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

// These cover the parts we can test without calling GitHub: the safety checks.
describe('GitHub OAuth guards', () => {
  it('redirects with an error when GitHub is not configured', async () => {
    const res = await request(app).get('/api/auth/github');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login?error=GITHUB_NOT_CONFIGURED');
  });

  it('rejects a callback without our state cookie (CSRF protection)', async () => {
    const res = await request(app).get('/api/auth/github/callback?code=abc&state=forged');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login?error=GITHUB_FAILED');
  });

  it('rejects a callback whose state does not match the cookie', async () => {
    const res = await request(app)
      .get('/api/auth/github/callback?code=abc&state=forged')
      .set('Cookie', 'osc_oauth_state=realstate.login');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('error=GITHUB_FAILED');
  });

  it('requires being logged in to connect GitHub', async () => {
    const res = await request(app).get('/api/auth/github/link');
    expect(res.status).toBe(401);
  });
});