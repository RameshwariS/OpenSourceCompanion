import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { perUserLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema, usernameParamSchema } from '../validators/users.validators.js';
import * as controller from '../controllers/users.controller.js';

const router = Router();

// Viewing a profile can trigger GitHub calls, so it is limited per user
const profileLimiter = perUserLimiter({ windowMs: 60_000, limit: 30, message: 'You are viewing profiles too fast.' });

router.use(authenticate);
router.get('/me', controller.getMe);
router.patch('/me', validate(updateProfileSchema), controller.updateMe);
router.get('/:username', profileLimiter, validate(usernameParamSchema), controller.getProfile); // after /me

export default router;