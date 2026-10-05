import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  contributionIdSchema,
  trackIssueSchema,
  updateContributionSchema,
} from '../validators/contributions.validators.js';
import * as controller from '../controllers/contributions.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', controller.list);
router.get('/stats', controller.stats); // must be declared before '/:id'
router.post('/', validate(trackIssueSchema), controller.track);
router.patch('/:id', validate(updateContributionSchema), controller.update);
router.delete('/:id', validate(contributionIdSchema), controller.remove);

export default router;