import { z } from 'zod';
import { DIFFICULTIES } from '../services/difficulty.service.js';
import { githubName, issueNumber, repoFullName } from './common.js';

const flag = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

// "a, b" -> ["a","b"]. Quotes are rejected because we put labels inside quotes in the search query.
const labels = z
  .string()
  .trim()
  .max(200)
  .transform((s) => s.split(',').map((l) => l.trim()).filter(Boolean))
  .pipe(z.array(z.string().max(50).regex(/^[^"\\\r\n]+$/, 'Invalid label')).max(3, 'Use at most 3 labels'))
  .optional();

export const listIssuesSchema = z.object({
  query: z.object({
    q: z.string().trim().max(80).optional(),
    language: z
      .string()
      .trim()
      .max(40)
      .regex(/^[A-Za-z0-9+#.\- ]+$/, 'Invalid language')
      .optional(),
    repo: repoFullName.optional(),
    org: z.string().trim().regex(/^[A-Za-z0-9-]{1,39}$/, 'Invalid organization').optional(),
    labels,
    difficulty: z.enum(DIFFICULTIES).optional(),
    goodFirstIssue: flag,
    helpWanted: flag,
    minStars: z.coerce.number().int().min(0).max(1_000_000).optional(),
    sort: z.enum(['updated', 'created', 'comments']).default('updated'),
    // 20 per page x 50 pages = 1000, GitHub's hard cap
    page: z.coerce.number().int().min(1).max(50).default(1),
  }),
});

export const getIssueSchema = z.object({
  params: z.object({ owner: githubName, repo: githubName, number: issueNumber }),
});