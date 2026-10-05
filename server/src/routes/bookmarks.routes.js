import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bookmarkIdSchema, createBookmarkSchema, listBookmarksSchema } from '../validators/bookmarks.validators.js';
import * as controller from '../controllers/bookmarks.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', validate(listBookmarksSchema), controller.list);
router.post('/', validate(createBookmarkSchema), controller.create);
router.delete('/:id', validate(bookmarkIdSchema), controller.remove);

export default router;