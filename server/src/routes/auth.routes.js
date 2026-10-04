import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../validators/auth.validators.js';
import * as controller from '../controllers/auth.controller.js';

const router = Router();

// Much stricter than the global limiter: slows down password guessing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many attempts, please try again in 15 minutes' },
});

router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/logout', controller.logout);

router.get('/github', controller.startGithubOAuth('login'));
router.get('/github/link', authenticate, controller.startGithubOAuth('link'));
router.get('/github/callback', controller.githubCallback);

export default router;