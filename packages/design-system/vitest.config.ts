import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node by default — nearly every suite here exercises a pure decision core,
    // or only imports modules and inspects exports; it never renders. Ark UI is
    // SSR-safe, so importing the barrel touches no DOM at module load.
    // `ThemeProvider.test.ts` opts into jsdom with a `@vitest-environment`
    // docblock, since the pre-paint bootstrap read-back is only observable in a
    // real first render.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
