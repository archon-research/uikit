import { defineConfig } from '@pandacss/dev';

import { designSystemPandaConfig } from './panda.shared';

export default defineConfig({
  ...designSystemPandaConfig,
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  outdir: 'styled-system',
});
