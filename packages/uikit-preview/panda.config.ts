import { defineConfig } from '@pandacss/dev';

import { designSystemPandaConfig } from '../design-system/panda.shared';

export default defineConfig({
  ...designSystemPandaConfig,
  dependencies: [
    '../design-system/panda.shared.ts',
    '../design-system/src/recipes/**/*.ts',
  ],
  include: [
    './src/**/*.{js,jsx,ts,tsx}',
    '../design-system/src/**/*.{js,jsx,ts,tsx}',
  ],
  outdir: 'styled-system',
});
