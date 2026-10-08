import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { perUserLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import { followOrgSchema, orgParamSchema } from '../validators/orgs.validators.js';
import * as controller from '../controllers/orgs.controller.js';
import notificationsRoutes from './notifications.routes.js';
import orgsRoutes from './orgs.routes.js';
const router = Router();

// Following checks the org on GitHub, so it costs quota
const followLimiter = perUserLimiter({ windowMs: 60 * 60_000, limit: 30, message: 'You are following organizations too fast.' });

router.use(authenticate);
router.get('/following', controller.list);
router.post('/following', followLimiter, validate(followOrgSchema), controller.follow);
router.delete('/following/:org', validate(orgParamSchema), controller.unfollow);
router.use('/notifications', notificationsRoutes);
router.use('/orgs', orgsRoutes);
export default router;