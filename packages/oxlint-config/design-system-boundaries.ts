import reactConfig from './react.js';

const designSystemBoundariesConfig = {
  ...reactConfig,
  rules: {
    ...reactConfig.rules,
    // Warn consumers when they bypass design-system entrypoints.
    'no-restricted-imports': [
      'warn',
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
