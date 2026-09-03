import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The preset is exercised through a real `vite build`; no DOM involved.
    environment: 'node',
    include: ['*.test.ts'],
  },
});
