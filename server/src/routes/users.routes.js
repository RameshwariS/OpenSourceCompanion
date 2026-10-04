import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMe } from '../controllers/users.controller.js';

const router = Router();

router.get('/me', authenticate, getMe);
// Phase 5 adds: PATCH /me and GET /:username

export default router;