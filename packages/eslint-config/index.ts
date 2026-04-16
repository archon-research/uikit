import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export type BaseConfigOptions = {
  ignores?: string[];
  ecmaVersion?: number;
  tsconfigRootDir?: string;
  project?: string[];
};

export function createBaseConfig(options: BaseConfigOptions = {}) {
  const {
    ignores = ['dist', 'generated', 'src/generated', 'styled-system'],
    ecmaVersion = 2020,
    tsconfigRootDir,
    project,
  } = options;

  return defineConfig(
    { ignores },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    importPlugin.flatConfigs.recommended,
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        ecmaVersion,
        globals: {
          ...globals.browser,
          ...globals.node,
        },
        parserOptions: {
          tsconfigRootDir,
          project,
        },
      },
      rules: {
        'import/order': [
          'warn',
          {
            groups: [
              'builtin',
              'external',
              'internal',
              'parent',
              'sibling',
              'index',
            ],
            alphabetize: {
              order: 'asc',
              caseInsensitive: true,
            },
            'newlines-between': 'always',
          },
        ],
        'import/no-relative-parent-imports': 'warn',
        'import/no-unresolved': 'off',
      },
    },
    prettier,
  );
}

export default createBaseConfig;
