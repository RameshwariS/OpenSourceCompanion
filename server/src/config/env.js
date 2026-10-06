import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

// An empty value in .env (e.g. GITHUB_CLIENT_ID=) is treated as "not set"
const optional = z
  .string()
  .optional()
  .transform((v) => v || undefined);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLIENT_URL: z.url().default('http://localhost:5173'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // 32 bytes = 64 hex characters, used for AES-256-GCM
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),

  GITHUB_CLIENT_ID: optional,
  GITHUB_CLIENT_SECRET: optional,
  GITHUB_CALLBACK_URL: optional,
  GITHUB_TOKEN: optional,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
