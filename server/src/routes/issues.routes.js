import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { optionalAuthenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getIssueSchema, listIssuesSchema, recommendedSchema } from '../validators/issues.validators.js';
import * as controller from '../controllers/issues.controller.js';

const router = Router();

const issuesLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  // Use user ID when logged in, fall back to IP for guests
  keyGenerator: (req) => req.user ? String(req.user._id) : req.ip,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { success: false, message: 'You are searching too fast. Please slow down.' },
});

// One feed can trigger up to 5 GitHub searches, so it gets its own tighter limit
const perIpLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  keyGenerator: (req) => req.user ? String(req.user._id) : req.ip,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

router.use(optionalAuthenticate, issuesLimiter);
router.get('/', validate(listIssuesSchema), controller.listIssues);
router.get('/recommended', perIpLimiter, validate(recommendedSchema), controller.recommended);
router.get('/:owner/:repo/:number', validate(getIssueSchema), controller.getIssue);

export default router;