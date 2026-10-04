import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const AUTH_COOKIE = 'osc_token';

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function signAuthToken(userId) {
  // The token only carries the user id (the `sub` claim). Role and status are
  // looked up in the database on every request, so changes apply immediately.
  return jwt.sign({}, env.JWT_SECRET, {
    subject: String(userId),
    expiresIn: TOKEN_TTL_SECONDS,
    algorithm: 'HS256',
  });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
}

const cookieBase = {
  httpOnly: true, // JavaScript cannot read it, so XSS can't steal it
  secure: env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax', // not sent on cross-site POSTs (CSRF defence)
  path: '/',
};

export function setAuthCookie(res, userId) {
  res.cookie(AUTH_COOKIE, signAuthToken(userId), {
    ...cookieBase,
    maxAge: TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieBase);
}