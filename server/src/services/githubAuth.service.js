import axios from 'axios';
import crypto from 'node:crypto';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { encrypt } from '../utils/crypto.js';

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const API_URL = 'https://api.github.com';

export function isGithubConfigured() {
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.GITHUB_CALLBACK_URL);
}

// Step 2 of the flow: where we send the user to approve access
export function getAuthorizeUrl(state) {
  if (!isGithubConfigured()) {
    throw new ApiError(503, 'GitHub login is not configured', { code: 'GITHUB_NOT_CONFIGURED' });
  }
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    // Least privilege: public profile + email only. No access to repositories.
    scope: 'read:user user:email',
    state,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

// Step 5: swap the one-time `code` for an access token. Uses the client SECRET,
// so this must only ever happen on the server.
async function exchangeCodeForToken(code) {
  const { data } = await axios.post(
    TOKEN_URL,
    {
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_CALLBACK_URL,
    },
    { headers: { Accept: 'application/json' }, timeout: 10_000 },
  );

  // GitHub returns HTTP 200 even for failures, with an `error` field
  if (data.error || !data.access_token) {
    throw new ApiError(401, 'GitHub authorization failed', { code: 'GITHUB_FAILED' });
  }
  return data.access_token;
}

// Step 6: who is this GitHub user?
async function fetchGithubProfile(accessToken) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const { data: profile } = await axios.get(`${API_URL}/user`, { headers, timeout: 10_000 });

  // Only trust an email GitHub says is primary AND verified
  let email = null;
  try {
    const { data: emails } = await axios.get(`${API_URL}/user/emails`, { headers, timeout: 10_000 });
    email = emails.find((e) => e.primary && e.verified)?.email?.toLowerCase() ?? null;
  } catch {
    // Not fatal: we fall back to GitHub's noreply address below
  }

  return {
    id: profile.id,
    login: profile.login,
    name: profile.name,
    avatarUrl: profile.avatar_url,
    email,
  };
}

const toGithubData = (profile, accessToken) => ({
  id: profile.id,
  username: profile.login,
  avatarUrl: profile.avatarUrl,
  accessTokenEnc: encrypt(accessToken),
});

async function generateUniqueUsername(login) {
  const base = login.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30) || 'user';
  let candidate = base;
  while (await User.exists({ username: candidate })) {
    candidate = `${base.slice(0, 25)}-${crypto.randomInt(1000, 10000)}`;
  }
  return candidate;
}

/** "Continue with GitHub": log in an existing GitHub user, or sign up a new one. */
export async function signInWithGithub(code) {
  const accessToken = await exchangeCodeForToken(code);
  const profile = await fetchGithubProfile(accessToken);

  // 1) Returning GitHub user
  const existing = await User.findOne({ 'github.id': profile.id });
  if (existing) {
    if (existing.status === 'suspended') {
      throw new ApiError(403, 'Your account has been suspended', { code: 'ACCOUNT_SUSPENDED' });
    }
    existing.github = toGithubData(profile, accessToken); // refresh avatar/username/token
    await existing.save();
    return existing;
  }

  // 2) The email already belongs to a different account -> do NOT auto-merge.
  //    (Explained in "Decisions" below: this prevents account pre-hijacking.)
  if (profile.email && (await User.exists({ email: profile.email }))) {
    throw new ApiError(409, 'An account with this email already exists', { code: 'GITHUB_EMAIL_EXISTS' });
  }

  // 3) Brand-new user
  return User.create({
    email: profile.email ?? `${profile.id}+${profile.login}@users.noreply.github.com`,
    username: await generateUniqueUsername(profile.login),
    name: profile.name || profile.login,
    github: toGithubData(profile, accessToken),
  });
}

/** "Connect GitHub" for an already logged-in user. */
export async function linkGithubAccount(user, code) {
  const accessToken = await exchangeCodeForToken(code);
  const profile = await fetchGithubProfile(accessToken);

  const owner = await User.findOne({ 'github.id': profile.id });
  if (owner && !owner._id.equals(user._id)) {
    throw new ApiError(409, 'This GitHub account is linked to another user', { code: 'GITHUB_ALREADY_LINKED' });
  }

  user.github = toGithubData(profile, accessToken);
  await user.save();
  return user;
}