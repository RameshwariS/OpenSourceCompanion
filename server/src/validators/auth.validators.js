import { z } from 'zod';

const RESERVED_USERNAMES = ['admin', 'me', 'api', 'settings', 'login', 'register', 'support'];

// Normalise first (trim + lowercase), then validate. Because zod checks
// `typeof === 'string'` first, a NoSQL-injection payload like
// { "email": { "$gt": "" } } is rejected before it ever reaches MongoDB.
const email = z.string().trim().toLowerCase().pipe(z.email('Please enter a valid email address'));

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt only uses the first 72 bytes
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens and underscores')
  .refine((u) => !RESERVED_USERNAMES.includes(u), 'This username is reserved');

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    username,
    email,
    password,
    // 'admin' is intentionally NOT allowed. Admins are created out-of-band.
    role: z.enum(['contributor', 'maintainer']).default('contributor'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email,
    // No strength rules on login, only "is a non-empty string"
    password: z.string().min(1, 'Password is required').max(200),
  }),
});