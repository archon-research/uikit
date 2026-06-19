import path from 'node:path';

import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: path.resolve(import.meta.dirname, 'worker.ts'),
      wrangler: {
        configPath: path.resolve(import.meta.dirname, 'wrangler.toml'),
      },
      miniflare: {
        bindings: {
          WEBMCP_RELAY_JWT_SECRET: 'test-secret-for-vitest-only',
          ALLOWED_ORIGINS: 'https://allowed.example, https://also.example',
        },
      },
    }),
  ],
  test: {
    include: ['demo-relay/**/*.test.ts'],
  },
});
