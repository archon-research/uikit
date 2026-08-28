import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The presets are run through the real oxlint binary; no DOM involved.
    environment: 'node',
    include: ['*.test.ts'],
  },
});
