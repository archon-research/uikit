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
    // --- React Compiler rules ------------------------------------------
    //
    // The umbrella `react/react-compiler` rule no longer exists — naming it
    // fails config parsing outright with "Rule 'react-compiler' not found in
    // plugin 'react'". As of oxlint 1.79.0 it is split into one rule per
    // compiler diagnostic, matching eslint-plugin-react-hooks v6.
    //
    // Enabled one by one rather than by raising `nursery`, which would pull in
    // far more than these.
    //
    // MEASURING THESE IS TRAPPED IN TWO WAYS, both of which produce a
    // convincing false zero:
    //   1. `rule-suppression` and `incompatible-library` are BAILOUTS — when
    //      either fires the compiler stops analysing that whole function, so
    //      every other violation inside it goes unreported. Setting the bailout
    //      rule to `off` does NOT recover them; only removing the suppression
    //      does. Counts are lower bounds.
    //   2. Inline `oxlint-disable` comments hide findings. Measure with them
    //      stripped as well as in place, and treat the worse number as real.
    'react/capitalized-calls': 'error',
    'react/error-boundaries': 'error',
    'react/globals': 'error',
    'react/hooks': 'error',
    'react/immutability': 'error',
    'react/invariant': 'error',
    'react/no-clone-element': 'error',
    'react/no-deriving-state-in-effects': 'error',
    'react/no-react-children': 'error',
    'react/preserve-manual-memoization': 'error',
    'react/purity': 'error',
    'react/refs': 'error',
    'react/set-state-in-render': 'error',
    'react/static-components': 'error',
    'react/syntax': 'error',
    'react/unsupported-syntax': 'error',
    'react/use-memo': 'error',
    'react/void-use-memo': 'error',
    // Enabled here rather than with the other 18: it had 3 findings, all
    // resetting state an external system owns, and each is fixed in a layer
    // below this one — `ThemeProvider`'s mount-time `matchMedia` read,
    // `usePlayback`'s live-buffer reset, and `mcp-connect`'s confirmation
    // countdown. With the last of them landed, this is the layer that earns it.
    'react/set-state-in-effect': 'error',
    // Deferred, with the reason and the current count. An unnamed rule and a
    // deliberately-deferred one must not look the same to a reader.
    //
    // Bailouts and dependency rules, deferred together: the suppressions are
    // what mask the other two, so removing them is the fix that unblocks all
    // three. Counts below are each rule's worse number across the two runs the
    // note above prescribes, measured over every package that consumes this
    // preset: `rule-suppression` 5 — all of them from the disables-in-place
    // run, since stripping a suppression is what removes the finding, and all
    // of them suppressions of `react-hooks/*` rules, which is the only kind
    // this rule sees; `exhaustive-effect-dependencies` 3, `memo-dependencies`
    // 2, `todo` 5, `incompatible-library` 1 (@tanstack/react-virtual's return
    // is not memoizable — a library fact, not repo debt). All but the first
    // are from the disables-stripped run.
    'react/rule-suppression': 'off',
    'react/exhaustive-effect-dependencies': 'off',
    'react/memo-dependencies': 'off',
    'react/todo': 'off',
    'react/incompatible-library': 'off',

    // --- react-perf: deliberately NOT enabled --------------------------------
    //
    // Measured in a consumer before this preset existed: `react-perf/*`
    // reported 106 findings, nearly all `className={css({...})}` and
    // JSX-passed-as-a-prop — i.e. precisely the hand-memoization the React
    // Compiler exists to remove. Enabling it would fight the compiler rules
    // above, telling authors to memoize by hand what the compiler already
    // memoizes for them.
    //
    // Recorded here rather than in a ticket so it is not re-proposed after
    // someone reads a blog post. If the compiler is ever turned OFF for a
    // consumer, this trade-off changes and is worth revisiting then.
  },
};

export default reactConfig;
