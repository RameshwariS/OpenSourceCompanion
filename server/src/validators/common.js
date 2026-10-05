import { z } from 'zod';

export const OWNER_REPO_REGEX = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const githubName = z.string().regex(/^[A-Za-z0-9_.-]{1,100}$/, 'Invalid name');
export const issueNumber = z.coerce.number().int().positive().max(10_000_000);
export const repoFullName = z.string().trim().regex(OWNER_REPO_REGEX, 'Repository must look like "owner/name"');