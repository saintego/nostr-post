import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Only the e2e tests here: package tests run with their own configs (`pnpm -r test`)
    include: ['tests/**/*.test.ts'],
  },
});
