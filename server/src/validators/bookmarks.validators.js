import { z } from 'zod';
import { DIFFICULTIES } from '../services/difficulty.service.js';
import { issueNumber, objectId, repoFullName } from './common.js';

export const createBookmarkSchema = z.object({
  // Only these two fields are accepted. Issue details always come from GitHub.
  body: z.object({ repo: repoFullName, number: issueNumber }),
});

export const listBookmarksSchema = z.object({
  query: z.object({
    sort: z.enum(['newest', 'oldest']).default('newest'),
    language: z.string().trim().max(40).optional(),
    difficulty: z.enum(DIFFICULTIES).optional(),
    q: z.string().trim().max(80).optional(),
  }),
});

export const bookmarkIdSchema = z.object({ params: z.object({ id: objectId }) });