import { z } from 'zod';
import { CONTRIBUTION_STATUSES } from '../models/Contribution.js';
import { issueNumber, objectId, repoFullName } from './common.js';

const status = z.enum(CONTRIBUTION_STATUSES);
const notes = z.string().max(2000, 'Notes can be at most 2000 characters');

export const trackIssueSchema = z.object({
  body: z.object({
    repo: repoFullName,
    number: issueNumber,
    status: status.default('interested'),
    notes: notes.default(''),
  }),
});

export const updateContributionSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({ status: status.optional(), notes: notes.optional() })
    .refine((b) => b.status !== undefined || b.notes !== undefined, 'Provide a status or notes to update'),
});

export const contributionIdSchema = z.object({ params: z.object({ id: objectId }) });