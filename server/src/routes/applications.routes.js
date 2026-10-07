import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { applicationIdSchema, respondSchema } from '../validators/opportunities.validators.js';
import * as controller from '../controllers/applications.controller.js';

const router = Router();

router.use(authenticate);
router.get('/mine', controller.mine);
router.delete('/:id', validate(applicationIdSchema), controller.withdraw);
router.patch('/:id', validate(respondSchema), controller.respond);

export default router;