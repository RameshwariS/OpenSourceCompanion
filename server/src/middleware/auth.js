import mongoose from 'mongoose';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { AUTH_COOKIE, verifyAuthToken } from '../utils/token.js';

// Returns the logged-in user or null. Never throws for bad/missing tokens.
export async function getUserFromRequest(req) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return null;

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    return null; // expired, tampered, or wrong algorithm
  }

  if (!mongoose.isValidObjectId(payload.sub)) return null;
  return User.findById(payload.sub);
}

// "Who are you?" -> 401 if we can't tell
export async function authenticate(req, res, next) {
  const user = await getUserFromRequest(req);
  if (!user) throw new ApiError(401, 'Authentication required');
  if (user.status === 'suspended') throw new ApiError(403, 'Your account has been suspended');

  req.user = user;
  next();
}

// "Are you allowed?" -> 403 if the role isn't permitted. Always use after authenticate.
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };