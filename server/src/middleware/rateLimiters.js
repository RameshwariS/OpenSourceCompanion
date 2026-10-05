import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/** Per-USER limiter (not per-IP). Use it after `authenticate`. */
export const perUserLimiter = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit,
    keyGenerator: (req) => String(req.user._id),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    message: { success: false, message },
  });