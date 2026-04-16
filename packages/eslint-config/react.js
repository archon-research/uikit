import { defineConfig } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

import { createBaseConfig } from './index.js';

export function createReactConfig(options = {}) {
  return defineConfig(
    createBaseConfig(options),
    jsxA11y.flatConfigs.recommended,
    reactHooks.configs.flat.recommended,
    {
      files: ['**/*.{ts,tsx}'],
      plugins: {
        'react-refresh': reactRefresh,
      },
      rules: {
        'react-refresh/only-export-components': [
          'warn',
          { allowConstantExport: true },
        ],
      },
    },
  );
}

export default createReactConfig;
