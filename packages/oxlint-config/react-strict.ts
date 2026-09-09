import reactConfig from './react.js';

/**
 * `typescript/no-explicit-any`, on its own.
 *
 * oxlint files this under `restriction`, which `base`'s categories
 * (`correctness` + `suspicious`) never reach — so, like `import/no-cycle`, it
 * only exists if something names it.
 *
 * It is separated from {@link fastRefreshRules} because the two halves of this
 * preset have opposite adoption stories, and a consumer should be able to take
 * one without the other:
 *
 * ```ts
 * import reactConfig from '@archon-research/oxlint-config/react';
 * import { noExplicitAnyRules } from '@archon-research/oxlint-config/react-strict';
 *
 * export default {
 *   ...reactConfig,
 *   rules: { ...reactConfig.rules, ...noExplicitAnyRules },
 * };
 * ```
 *
 * KNOWN LIMIT — there is no way to allow `any` in a type position and deny it
 * in a value position. oxlint's schema for this rule is
 * `additionalProperties: false` over exactly two keys, `fixToUnknown` and
 * `ignoreRestArgs`; neither expresses position. So a generic *constraint* that
 * genuinely requires `any` has to be suppressed at the site rather than
 * configured away. `http-client-react`'s `QueryApiPaths` is the worked example
 * — see the comment there for why `unknown` is wrong in that position.
 */
export const noExplicitAnyRules = {
  'typescript/no-explicit-any': 'error',
};

/**
 * `react/only-export-components`, on its own.
 *
 * WHO THIS IS FOR: applications with Fast Refresh. The rule is HMR hygiene, not
 * correctness — a mixed-export module makes the bundler fall back to a full
 * reload instead of preserving component state. That payoff exists in an app
 * dev server; it does not exist in a published library, whose modules are not
 * the boundaries the consumer's Fast Refresh reloads.
 *
 * `allowConstantExport` matches what the upstream plugin's `vite` preset sets
 * and costs nothing. It is not a rescue: measured across this repo it moves the
 * count by 3 (see the note on the default export).
 */
export const fastRefreshRules = {
  'react/only-export-components': ['error', { allowConstantExport: true }],
};

/** Both halves, as the default export applies them. */
export const reactStrictRules = {
  ...noExplicitAnyRules,
  ...fastRefreshRules,
};

/**
 * `react` plus the two `restriction`-category rules that preset deliberately
 * leaves out. Opt-in: neither is free, and neither belongs in a preset every
 * consumer takes by default.
 *
 * THIS REPO DOES NOT PASS THIS PRESET, AND NO PACKAGE HERE ADOPTS IT.
 * Measured across all 16 linted workspaces on the tree that added this file,
 * and again with every `oxlint-disable` directive stripped so nothing could be
 * masked (the two measurements agreed):
 *
 * | rule                           | violations in this repo             |
 * | ------------------------------ | ----------------------------------- |
 * | `typescript/no-explicit-any`   | 0, via one line-scoped suppression  |
 * | `react/only-export-components` | 76                                  |
 *
 * Those numbers are the point of this doc comment, not a footnote to it. A
 * preset that reads as coverage it does not have is the exact defect this
 * package has already had to fix once.
 *
 * The first row started at 4: two lazy prop annotations in a preview story,
 * fixed properly, and the two in `http-client-react`'s `QueryApiPaths`, which
 * are suppressed on their single line with the reasoning recorded there. So
 * this repo would pass the `no-explicit-any` half today — but it does not
 * *enable* it, and a clean measurement is not adoption.
 *
 * WHY THE SECOND NUMBER IS SO LARGE, AND WHY IT IS NOT A BACKLOG.
 * Every one of the 76 is a library-authoring pattern, not a latent app bug.
 * Grouped by the form of the flagged export (counts approximate, since a
 * multi-line signature is awkward to bucket): roughly half are exported hooks
 * sitting next to the provider that backs them — all 20 of `charting`'s
 * `interaction.tsx`, plus `design-system`'s `FilterProvider` — about a dozen
 * are unexported compound-component parts (`Popover`, `Drawer`), around nine
 * are re-export specifiers in a package's barrel entrypoint, and the remainder
 * are helpers co-located with the component they serve. Satisfying the
 * rule here would mean splitting hooks away from their context and breaking up
 * public entrypoints to buy Fast-Refresh behaviour in a package that has no
 * Fast Refresh. That is why this ships as an opt-in entrypoint rather than
 * being added to `react`, and why the recommendation is that a *consumer app*
 * adopt it and this repo not.
 *
 * ```ts
 * import reactStrictConfig from '@archon-research/oxlint-config/react-strict';
 * import { defineConfig } from 'oxlint';
 *
 * export default defineConfig({ ...reactStrictConfig });
 * ```
 *
 * NAMING. Variants in this package are named `<base-preset>-<what-it-adds>`,
 * so the prefix says which preset they compose on and the suffix says which
 * axis they tighten. A sibling preset for the pedantic module-size rules
 * (`max-lines`, `max-lines-per-function`, `import/max-dependencies`) has been
 * proposed; under this scheme it is `react-structure`, not `strict-structure`.
 * Prefixing by severity instead would fragment the namespace — some variants
 * grouped by the preset they extend, others by how strict they are — and leave
 * a consumer scanning the exports map to work out which holds what.
 */
const reactStrictConfig = {
  ...reactConfig,
  rules: {
    ...reactConfig.rules,
    ...reactStrictRules,
  },
};

export default reactStrictConfig;
