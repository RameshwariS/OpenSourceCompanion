import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { perUserLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import { keySchema, summarySchema, chatSchema } from '../validators/ai.validators.js';
import * as controller from '../controllers/ai.controller.js';

const router = Router();
const aiLimit = perUserLimiter({ windowMs: 60_000, limit: 12, message: 'AI request limit reached. Please wait a minute.' });
router.use(authenticate);
router.get('/key', controller.keyStatus);
router.put('/key', aiLimit, validate(keySchema), controller.saveKey);
router.delete('/key', aiLimit, controller.deleteKey);
router.post('/issues/:owner/:repo/:number/summary', aiLimit, validate(summarySchema), controller.summarize);
router.post('/chat', aiLimit, validate(chatSchema), controller.chat);
export default router;
