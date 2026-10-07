import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { dashboard } from '../controllers/maintainer.controller.js';

const router = Router();

router.get('/dashboard', authenticate, authorize('maintainer', 'admin'), dashboard);

export default router;