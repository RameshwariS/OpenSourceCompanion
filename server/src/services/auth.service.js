import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

// Cost 12 is a good production default. Tests use 4 so they stay fast.
const BCRYPT_COST = env.NODE_ENV === 'test' ? 4 : 12;

// Compared against when the email doesn't exist, so "unknown email" takes as
// long as "wrong password" and attackers can't tell them apart by timing.
const DUMMY_HASH = bcrypt.hashSync('timing-attack-protection', BCRYPT_COST);

export async function registerUser({ name, username, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  try {
    return await User.create({ name, username, email, passwordHash, role });
  } catch (err) {
    // 11000 = duplicate key. We rely on the unique indexes, which also covers
    // two simultaneous requests (a "check then insert" approach would race).
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern ?? {})[0];
      throw new ApiError(409, field === 'username' ? 'Username is already taken' : 'Email is already registered');
    }
    throw err;
  }
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');

  // GitHub-only accounts have no passwordHash, so they can't log in with a password.
  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  // Same message for "no such user" and "wrong password" (no account enumeration)
  if (!user || !user.passwordHash || !matches) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.status === 'suspended') {
    throw new ApiError(403, 'Your account has been suspended');
  }
  return user;
}