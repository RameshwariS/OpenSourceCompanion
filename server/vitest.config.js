import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/opensourcecompanion_test',
      JWT_SECRET: 'test-only-jwt-secret-with-at-least-32-characters',
      TOKEN_ENCRYPTION_KEY: '0000000000000000000000000000000000000000000000000000000000000000',
      GITHUB_TOKEN: '',
      REDIS_URL: '',
    },
  },
});
