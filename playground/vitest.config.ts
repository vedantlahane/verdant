import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts', 'tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@verdant/parser': new URL('../packages/parser/src/index.ts', import.meta.url).pathname,
    },
  },
});
