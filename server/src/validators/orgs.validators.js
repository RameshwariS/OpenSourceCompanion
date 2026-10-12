import { z } from 'zod';

const org = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{1,39}$/, 'Invalid organization name');

export const followOrgSchema = z.object({ body: z.object({ org }) });
export const orgParamSchema = z.object({ params: z.object({ org }) });