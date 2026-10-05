import { z } from 'zod';

const isHttpUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const isLinkedIn = (value) => {
  if (!isHttpUrl(value)) return false;
  const host = new URL(value).hostname.toLowerCase();
  return host === 'linkedin.com' || host.endsWith('.linkedin.com');
};

// These URLs end up in <a href>. Allowing only http(s) blocks `javascript:` links (XSS).
const optionalUrl = (check, message) =>
  z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === '' || check(v), message); // '' means "clear this field"

const skills = z
  .array(z.string().trim().min(1, 'Skills cannot be empty').max(30, 'A skill can be at most 30 characters'))
  .max(15, 'You can list at most 15 skills')
  .transform((list) => {
    const seen = new Set();
    return list.filter((s) => !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
  });

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, 'Name is required').max(80),
      bio: z.string().trim().max(500, 'Bio can be at most 500 characters'),
      skills,
      location: z.string().trim().max(100),
      portfolioUrl: optionalUrl(isHttpUrl, 'Portfolio must be a valid http(s) URL'),
      linkedinUrl: optionalUrl(isLinkedIn, 'LinkedIn must be a linkedin.com URL'),
    })
    .partial()
    .refine((b) => Object.keys(b).length > 0, 'Provide at least one field to update'),
});

export const usernameParamSchema = z.object({
  params: z.object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_-]{3,30}$/, 'Invalid username'),
  }),
});