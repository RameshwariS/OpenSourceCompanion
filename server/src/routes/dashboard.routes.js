import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { perUserLimiter } from '../middleware/rateLimiters.js';
import * as controller from '../controllers/dashboard.controller.js';

const router = Router();

const limiter = perUserLimiter({ windowMs: 60_000, limit: 20, message: 'Too many requests. Please slow down.' });

router.get('/', authenticate, limiter, controller.get);

export default router;