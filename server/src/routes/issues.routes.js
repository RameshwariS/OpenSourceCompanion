import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getIssueSchema, listIssuesSchema } from '../validators/issues.validators.js';
import * as controller from '../controllers/issues.controller.js';

const router = Router();

const issuesLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { success: false, message: 'You are searching too fast. Please slow down.' },
});

router.use(authenticate, issuesLimiter);
router.get('/', validate(listIssuesSchema), controller.listIssues);
router.get('/:owner/:repo/:number', validate(getIssueSchema), controller.getIssue);

export default router;