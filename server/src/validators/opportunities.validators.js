import { z } from 'zod';
import { DIFFICULTIES } from '../services/difficulty.service.js';
import { objectId } from './common.js';

const skills = z
  .array(z.string().trim().min(1, 'Skills cannot be empty').max(30, 'A skill can be at most 30 characters'))
  .max(10, 'You can list at most 10 skills')
  .transform((list) => {
    const seen = new Set();
    return list.filter((s) => !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
  });

const hours = z.coerce.number().int().min(1, 'Hours must be at least 1').max(500, 'Hours can be at most 500');

const fields = {
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(5000),
  skills,
  difficulty: z.enum(DIFFICULTIES),
  expectedHoursMin: hours,
  expectedHoursMax: hours,
};

const page = z.coerce.number().int().min(1).max(500).default(1);

export const listOpportunitiesSchema = z.object({
  query: z.object({
    skill: z.string().trim().max(30).optional(),
    difficulty: z.enum(DIFFICULTIES).optional(),
    language: z
      .string()
      .trim()
      .max(40)
      .regex(/^[A-Za-z0-9+#.\- ]+$/, 'Invalid language')
      .optional(),
    project: objectId.optional(),
    status: z.enum(['open', 'closed']).default('open'),
    page,
  }),
});

export const mineSchema = z.object({ query: z.object({ page }) });

export const createOpportunitySchema = z.object({
  body: z
    .object({ project: objectId, ...fields, skills: skills.default([]) })
    .refine((b) => b.expectedHoursMin <= b.expectedHoursMax, {
      message: 'Maximum hours must be at least the minimum',
      path: ['expectedHoursMax'],
    }),
});

export const updateOpportunitySchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({ ...fields, status: z.enum(['open', 'closed']) })
    .partial()
    .refine((b) => Object.keys(b).length > 0, 'Provide at least one field to update'),
});

export const opportunityIdSchema = z.object({ params: z.object({ id: objectId }) });

export const applySchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ message: z.string().trim().min(10, 'Tell the maintainer a little about yourself (10+ characters)').max(1000) }),
});

export const applicationIdSchema = z.object({ params: z.object({ id: objectId }) });

export const respondSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(['accepted', 'declined']),
    reply: z.string().trim().max(1000).default(''),
  }),
});