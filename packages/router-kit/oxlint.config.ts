import baseConfig from '@archon-research/oxlint-config/base';

export default {
  ...baseConfig,
  rules: {
    // The router names the field: a route match's validated search — every
    // parent schema folded in — is read as `_strictSearch`, and both the entry
    // cleanup and the settle harness exist to read it.
    'no-underscore-dangle': 'off',
  },
};
