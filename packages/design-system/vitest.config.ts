import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node environment is sufficient — the manifest test only imports modules
    // and inspects exports; it never renders. Ark UI is SSR-safe, so importing
    // the barrel touches no DOM at module load.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
