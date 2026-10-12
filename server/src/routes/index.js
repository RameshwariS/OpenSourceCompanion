import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import issuesRoutes from './issues.routes.js';
import bookmarksRoutes from './bookmarks.routes.js';
import contributionsRoutes from './contributions.routes.js';
import pullRequestsRoutes from './pullRequests.routes.js';
import projectsRoutes from './projects.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import notificationsRoutes from './notifications.routes.js';
import orgsRoutes from './orgs.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/issues', issuesRoutes);
router.use('/bookmarks', bookmarksRoutes);
router.use('/contributions', contributionsRoutes);
router.use('/pull-requests', pullRequestsRoutes);
router.use('/projects', projectsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/orgs', orgsRoutes);

export default router;
