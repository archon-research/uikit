import baseConfig from './base.js';

const reactConfig = {
  ...baseConfig,
  plugins: [...baseConfig.plugins, 'react', 'react-hooks', 'jsx-a11y'],
  rules: {
    ...baseConfig.rules,
    'react/react-in-jsx-scope': 'off',
    // oxlint files both of these under `pedantic`, so the categories inherited
    // from `base` never reach them — `rules-of-hooks` in particular was absent
    // from the effective config of every consumer of this preset. They are
    // named one by one rather than by raising a whole category, which would
    // also pull in `max-lines`, `max-lines-per-function` and
    // `import/max-dependencies`.
    'react/rules-of-hooks': 'error',
    'react/jsx-no-target-blank': 'error',
    // --- React Compiler rules: NOT enabled here yet -------------------------
    //
    // The umbrella `react/react-compiler` rule no longer exists (naming it in
    // a config fails with "Rule 'react-compiler' not found in plugin 'react'").
    // As of oxlint 1.79.0 it is split into one rule per compiler diagnostic,
    // matching eslint-plugin-react-hooks v6, all under the `react` plugin:
    //
    //   capitalized-calls, error-boundaries, exhaustive-effect-dependencies,
    //   globals, hooks, immutability, incompatible-library, invariant,
    //   memo-dependencies, no-clone-element, no-deriving-state-in-effects,
    //   no-react-children, preserve-manual-memoization, purity, refs,
    //   rule-suppression, set-state-in-effect, set-state-in-render,
    //   static-components, syntax, todo, unsupported-syntax, use-memo,
    //   void-use-memo
    //
    // When they go on, they go on at `warn`, not `error`. Running the full set
    // over `design-system` leaves four findings that are judgement calls with a
    // behavioural cost, not tooling limits:
    //
    //   - `set-state-in-effect` x2 (`usePlayback`'s live subscribe reset,
    //     `ThemeProvider`'s mount-time `matchMedia` read). Both reset state an
    //     external system owns; the compiler's remedy (remount on a `key`) is
    //     not available to a hook, and deriving instead changes observable
    //     behaviour.
    //   - `incompatible-library` (`@tanstack/react-virtual`'s return is not
    //     memoizable).
    //   - `rule-suppression` (an `exhaustive-deps` suppression on a deliberate
    //     identity re-anchor).
    //
    // Two things worth knowing before measuring with these:
    //   1. A `rule-suppression` or `incompatible-library` finding is a BAILOUT
    //      — the compiler stops analysing that whole function, so any other
    //      violation inside it goes unreported. Counts are lower bounds.
    //   2. Inline `oxlint-disable` comments hide findings from the count, so
    //      measure with and without them.
  },
};

export default reactConfig;
