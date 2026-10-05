import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { perUserLimiter } from '../middleware/rateLimiters.js';
import * as controller from '../controllers/pullRequests.controller.js';

const router = Router();

const readLimiter = perUserLimiter({ windowMs: 60_000, limit: 20, message: 'Too many requests. Please slow down.' });
// Manual refresh bypasses the cache, so it is allowed once every 5 minutes
const refreshLimiter = perUserLimiter({
  windowMs: 5 * 60_000,
  limit: 1,
  message: 'You can refresh your pull requests once every 5 minutes.',
});

router.use(authenticate);
router.get('/', readLimiter, controller.list);
router.get('/stats', readLimiter, controller.stats);
router.post('/refresh', refreshLimiter, controller.refresh);

export default router;