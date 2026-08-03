import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node environment is sufficient — the validator tests are pure logic over
    // the schema + zod passes; they never render a component. Keeping them
    // DOM-free matches the design-system test style (no jsdom here).
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
