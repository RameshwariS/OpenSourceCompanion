import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

router.use('/health', healthRoutes);
// Later phases register: /auth, /users, /issues, /bookmarks, ...

export default router;