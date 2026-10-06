import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { perUserLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import {
  listProjectsSchema,
  projectIdSchema,
  registerProjectSchema,
  updateProjectSchema,
} from '../validators/projects.validators.js';
import * as controller from '../controllers/projects.controller.js';

const router = Router();

// A project page fans out to several (cached) GitHub calls, so it is limited per user
const detailLimiter = perUserLimiter({ windowMs: 60_000, limit: 20, message: 'You are opening projects too fast.' });
const registerLimiter = perUserLimiter({
  windowMs: 60 * 60_000,
  limit: 10,
  message: 'You can list at most 10 projects per hour.',
});

router.use(authenticate);
router.get('/', validate(listProjectsSchema), controller.list);
// Backend authorization: the frontend hiding the button is only UX
router.post('/', authorize('maintainer', 'admin'), registerLimiter, validate(registerProjectSchema), controller.create);
router.get('/:id', detailLimiter, validate(projectIdSchema), controller.get);
router.patch('/:id', validate(updateProjectSchema), controller.update);
router.delete('/:id', validate(projectIdSchema), controller.remove);
router.post('/:id/follow', validate(projectIdSchema), controller.follow);
router.delete('/:id/follow', validate(projectIdSchema), controller.unfollow);

export default router;