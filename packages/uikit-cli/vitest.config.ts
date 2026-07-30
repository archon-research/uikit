import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The CLI's unit tests only exercise pure functions (CSS scanning); no DOM.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
