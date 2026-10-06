import { z } from 'zod';
import { objectId, repoFullName } from './common.js';
import { isHttpUrl, optionalUrl } from './users.validators.js';

const flag = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

export const listProjectsSchema = z.object({
  query: z.object({
    q: z.string().trim().max(80).optional(),
    language: z
      .string()
      .trim()
      .max(40)
      .regex(/^[A-Za-z0-9+#.\- ]+$/, 'Invalid language')
      .optional(),
    topic: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]{1,50}$/, 'Invalid topic')
      .optional(),
    following: flag,
    sort: z.enum(['stars', 'newest', 'beginner']).default('stars'),
    page: z.coerce.number().int().min(1).max(500).default(1),
  }),
});

// Only the repo name is accepted. Everything else comes from GitHub.
export const registerProjectSchema = z.object({ body: z.object({ repo: repoFullName }) });

export const projectIdSchema = z.object({ params: z.object({ id: objectId }) });

export const updateProjectSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      summary: z.string().trim().max(1000, 'Summary can be at most 1000 characters'),
      contributingUrl: optionalUrl(isHttpUrl, 'Contributing link must be a valid http(s) URL'),
    })
    .partial()
    .refine((b) => Object.keys(b).length > 0, 'Provide at least one field to update'),
});