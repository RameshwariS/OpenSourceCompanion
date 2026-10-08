import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listNotificationsSchema, notificationIdSchema } from '../validators/notifications.validators.js';
import * as controller from '../controllers/notifications.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', validate(listNotificationsSchema), controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/read-all', controller.readAll);
router.patch('/:id/read', validate(notificationIdSchema), controller.read);

export default router;