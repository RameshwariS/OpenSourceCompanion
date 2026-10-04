import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { setAuthCookie, clearAuthCookie } from '../utils/token.js';
import { getUserFromRequest } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';
import * as githubAuthService from '../services/githubAuth.service.js';

export async function register(req, res) {
  const user = await authService.registerUser(req.validated.body);
  setAuthCookie(res, user._id);
  res.status(201).json({ success: true, data: { user }, message: 'Account created successfully' });
}

export async function login(req, res) {
  const user = await authService.loginUser(req.validated.body);
  setAuthCookie(res, user._id);
  res.status(200).json({ success: true, data: { user }, message: 'Logged in successfully' });
}

export function logout(req, res) {
  clearAuthCookie(res);
  res.status(200).json({ success: true, data: null, message: 'Logged out' });
}

// ---------------- GitHub OAuth ----------------

const OAUTH_STATE_COOKIE = 'osc_oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const oauthCookieBase = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax', // must be lax (not strict) so the cookie survives the redirect back from github.com
  path: '/api/auth/github',
};

function redirectWithError(res, mode, code) {
  const page = mode === 'link' ? '/dashboard' : '/login';
  res.redirect(`${env.CLIENT_URL}${page}?error=${code}`);
}

// Step 1-2: create a random `state`, remember it in a short-lived cookie, send user to GitHub
export const startGithubOAuth = (mode) => (req, res) => {
  if (!githubAuthService.isGithubConfigured()) {
    return redirectWithError(res, mode, 'GITHUB_NOT_CONFIGURED');
  }
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(OAUTH_STATE_COOKIE, `${state}.${mode}`, { ...oauthCookieBase, maxAge: OAUTH_STATE_TTL_MS });
  res.redirect(githubAuthService.getAuthorizeUrl(state));
};

// Step 3-9: GitHub sends the user back here with ?code=...&state=...
export async function githubCallback(req, res) {
  const stored = req.cookies?.[OAUTH_STATE_COOKIE] ?? '';
  res.clearCookie(OAUTH_STATE_COOKIE, oauthCookieBase); // single use

  const [expectedState, rawMode] = stored.split('.');
  const mode = rawMode === 'link' ? 'link' : 'login';
  const { code, state, error } = req.query;

  if (error) return redirectWithError(res, mode, 'GITHUB_DENIED'); // user clicked "Cancel"

  // CSRF check: the state GitHub echoes back must match the one in OUR cookie
  if (!expectedState || typeof code !== 'string' || typeof state !== 'string' || state !== expectedState) {
    return redirectWithError(res, mode, 'GITHUB_FAILED');
  }

  try {
    if (mode === 'link') {
      const user = await getUserFromRequest(req);
      if (!user) return redirectWithError(res, 'login', 'GITHUB_FAILED');
      await githubAuthService.linkGithubAccount(user, code);
      return res.redirect(`${env.CLIENT_URL}/dashboard?github=linked`);
    }

    const user = await githubAuthService.signInWithGithub(code);
    setAuthCookie(res, user._id);
    res.redirect(`${env.CLIENT_URL}/dashboard`);
  } catch (err) {
    console.error('GitHub OAuth failed:', err.message);
    const reason = err instanceof ApiError && err.code ? err.code : 'GITHUB_FAILED';
    redirectWithError(res, mode, reason);
  }
}