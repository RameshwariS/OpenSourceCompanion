import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { perUserLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import {
  applySchema,
  createOpportunitySchema,
  listOpportunitiesSchema,
  mineSchema,
  opportunityIdSchema,
  updateOpportunitySchema,
} from '../validators/opportunities.validators.js';
import * as controller from '../controllers/opportunities.controller.js';

const router = Router();

const createLimiter = perUserLimiter({ windowMs: 60 * 60_000, limit: 20, message: 'You are posting too many opportunities.' });
const applyLimiter = perUserLimiter({ windowMs: 60 * 60_000, limit: 20, message: 'You are applying too fast. Please slow down.' });

router.use(authenticate);

router.get('/', validate(listOpportunitiesSchema), controller.list);
router.post('/', authorize('maintainer', 'admin'), createLimiter, validate(createOpportunitySchema), controller.create);

router.get('/:id', validate(opportunityIdSchema), controller.get);
router.patch('/:id', validate(updateOpportunitySchema), controller.update);
router.delete('/:id', validate(opportunityIdSchema), controller.remove);

router.get('/mine', authorize('maintainer', 'admin'), validate(mineSchema), controller.mine);

router.post('/:id/applications', applyLimiter, validate(applySchema), controller.apply);
router.get('/:id/applications', validate(opportunityIdSchema), controller.applicants);

export default router;