import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  preflight: true,
  include: [
    './src/**/*.{js,jsx,ts,tsx}',
    '../design-system/src/**/*.{js,jsx,ts,tsx}',
  ],
  outdir: 'styled-system',
  theme: {
    extend: {
      tokens: {
        colors: {
          brand: {
            500: { value: '#0557d9' },
            600: { value: '#0449b6' },
          },
        },
      },
    },
  },
});
