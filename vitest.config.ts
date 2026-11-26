import { defineConfig } from 'vitest/config';
import path from 'path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    env: { DATABASE_URL: 'postgresql://postgres@localhost:5432/edlux_test', DIRECT_URL: 'postgresql://postgres@localhost:5432/edlux_test', APP_SECRET: 'test-secret', EMAIL_PROVIDER: 'dev', NODE_ENV: 'test' },
  },
});
