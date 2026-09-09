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
 * count from 79 to 76, and all three it forgives are literal constants —
 * `charting`'s `DEFAULT_BIN_COUNT` and `FALLBACK_CHART_WIDTH`, and
 * `design-system`'s `DEFAULT_RANGE_PRESET`. See the note on the default export
 * for what the remaining 76 are.
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
 * Measured across all 16 linted workspaces, twice: once as the repo stands,
 * and once over a copy with every `oxlint-disable` and `eslint-disable`
 * directive stripped, so nothing could be masked.
 *
 * | rule                           | as it stands | disables stripped |
 * | ------------------------------ | ------------ | ----------------- |
 * | `typescript/no-explicit-any`   | 0            | 2                 |
 * | `react/only-export-components` | 76           | 76                |
 *
 * Those numbers are the point of this doc comment, not a footnote to it. A
 * preset that reads as coverage it does not have is the exact defect this
 * package has already had to fix once — which is also why the two columns are
 * reported separately rather than collapsed into one reassuring figure.
 *
 * Row 1 started at 4: two lazy prop annotations in a preview story, fixed
 * properly, and the two on a single line of `http-client-react`'s
 * `src/query-api.ts` — `QueryApiPaths`'s generic constraint — suppressed there
 * with the reasoning recorded alongside. That suppression is the whole
 * difference between the two columns, so the honest reading of row 1 is "2,
 * both understood, both silenced deliberately", not "0". Either way this repo
 * does not *enable* the rule, and a clean measurement is not adoption.
 *
 * Row 2 is identical in both columns because nothing in this repo suppresses
 * it: every disable directive in a linted source names some other rule.
 *
 * WHY ROW 2 IS SO LARGE, AND WHY IT IS NOT A BACKLOG.
 * Every one of the 76 is a library-authoring pattern, not a latent app bug.
 * The rule splits them itself, by which side of the file it asks you to move:
 * 63 are a non-component export in a file that also exports a component, and
 * 13 are a component in a file that exports no component at all.
 *
 * The 63 are, exactly:
 *
 *   - 26 exported hooks in a file that also exports the component they pair
 *     with. 23 read a context declared in that same file — 16 in `charting`'s
 *     `interaction.tsx`, 6 in `design-system`'s `FilterProvider`, 1 in
 *     `webmcp`'s `provider.tsx`. The other 3 sit beside the component built on
 *     them: 2 in `charting`'s `responsive.tsx`, 1 in `design-system`'s
 *     `FlashOnChange`.
 *   - 24 helpers and constants co-located with the component they serve —
 *     `clamp`, `heatStep`, `meterPercent`, `flashClass`, `DEFAULT_REGISTRY`
 *     and the like — spread thinly across 15 files, never more than 4 in one.
 *   - 13 value re-export specifiers in a single file, `http-client-react`'s
 *     `src/index.tsx`. That barrel is flagged only because it also exports
 *     `HttpProvider`: the one component the package ships is what makes its
 *     entrypoint a mixed-export module. Type-only re-exports are not flagged,
 *     which is why the count is 13 and not the whole export list.
 *
 * The 13 are all compound components — 6 parts of `Popover` and 6 of `Drawer`,
 * each assembled into an exported namespace object the rule does not read as a
 * component export, plus `dashboard-kit`'s internal `ChartingInteractionSync`.
 *
 * Satisfying the rule here would mean splitting hooks away from their context,
 * breaking up compound components, and un-mixing a public entrypoint — to buy
 * Fast-Refresh behaviour in packages that have no Fast Refresh. That is why
 * this ships as an opt-in entrypoint rather than being added to `react`, and
 * why the recommendation is that a *consumer app* adopt it and this repo not.
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
