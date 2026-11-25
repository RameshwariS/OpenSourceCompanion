import { z } from 'zod';
const repoPart = z.string().regex(/^[A-Za-z0-9_.-]+$/);
export const keySchema = z.object({ body: z.object({ provider: z.enum(['openai', 'gemini', 'anthropic']), model: z.string().trim().max(120).optional(), apiKey: z.string().trim().min(1).max(500) }) });
export const summarySchema = z.object({ params: z.object({ owner: repoPart, repo: repoPart, number: z.coerce.number().int().positive() }) });
export const chatSchema = z.object({ body: z.object({ repoFullName: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/), issueNumber: z.number().int().positive().optional(), question: z.string().trim().min(1).max(3000), conversationId: z.string().regex(/^[a-f\d]{24}$/i).optional() }) });
