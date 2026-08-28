import reactConfig from './react.js';

const designSystemBoundariesConfig = {
  ...reactConfig,
  rules: {
    ...reactConfig.rules,
    // Fail consumers who bypass design-system entrypoints. This is `error`
    // rather than `warn` because oxlint exits 0 on warnings unless the caller
    // passes `--deny-warnings`/`--max-warnings`, which made the boundary
    // decorative; raising `categories` consumer-side does not reach it either,
    // since per-rule severity wins over category severity.
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@ark-ui/react',
            message:
              'Import from @archon-research/design-system instead of @ark-ui/react.',
          },
        ],
        patterns: [
          {
            group: ['@ark-ui/react/*'],
            message:
              'Import from @archon-research/design-system instead of @ark-ui/react subpaths.',
          },
        ],
      },
    ],
  },
};

export default designSystemBoundariesConfig;
