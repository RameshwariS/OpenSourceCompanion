import { z } from 'zod';
import { objectId } from './common.js';

export const listNotificationsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    unread: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  }),
});

export const notificationIdSchema = z.object({ params: z.object({ id: objectId }) });