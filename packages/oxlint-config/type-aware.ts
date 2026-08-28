import reactConfig from './react.js';

/**
 * The promise-safety rules, on their own so a non-React consumer can merge them
 * into `base` instead of taking the whole React preset:
 *
 * ```ts
 * import baseConfig from '@archon-research/oxlint-config/base';
 * import { typeAwareRules } from '@archon-research/oxlint-config/type-aware';
 *
 * export default {
 *   ...baseConfig,
 *   rules: { ...baseConfig.rules, ...typeAwareRules },
 * };
 * ```
 *
 * None of these run unless oxlint is invoked with `--type-aware` and the
 * `oxlint-tsgolint` package is installed. Without both they still appear in
 * `--print-config`, which is what made them read as coverage when they were
 * inert.
 */
export const typeAwareRules = {
  // The reason this preset exists: an unawaited promise in a React data-fetching
  // path fails silently and leaves no stack to follow.
  'typescript/no-floating-promises': 'error',
  // Catches a promise-returning handler passed where a void return is expected
  // — `onSelect={async () => …}` and friends.
  'typescript/no-misused-promises': 'error',
  'typescript/await-thenable': 'error',
  'typescript/no-base-to-string': 'error',

  // `--type-aware` switches these on by default. They are style rules rather
  // than correctness ones and are noisy on an existing codebase, so this preset
  // buys the promise-safety family without them. A consumer who wants them can
  // turn them back on.
  'typescript/no-unsafe-type-assertion': 'off',
  'typescript/consistent-return': 'off',
  'typescript/no-unnecessary-type-assertion': 'off',
  'typescript/no-unnecessary-type-parameters': 'off',
};

const typeAwareConfig = {
  ...reactConfig,
  rules: {
    ...reactConfig.rules,
    ...typeAwareRules,
  },
};

export default typeAwareConfig;
