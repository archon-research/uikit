/**
 * THE authoritative definition of the chart color token families —
 * `colors.chart.*` (the role ramp plus axis/grid/area chrome) and
 * `colors.identity.*` (the per-entity palette behind `useIdentityPalette`).
 *
 * Why this lives in its own module rather than inline in the Panda config:
 * these two families were previously written out twice, once in
 * `src/panda-preset.ts` (the published preset) and once in `panda.shared.ts`
 * (the internal config this repo's own preview consumes). The two drifted —
 * `identity.*` existed only in the preset, so every `var(--colors-identity-N)`
 * read in the preview resolved to nothing. Both configs now spread this one
 * object, so the families cannot diverge again.
 *
 * The literal is already in Panda's `semanticTokens.colors` shape, so it
 * spreads straight into either config with no adaptation. It is deliberately
 * NOT `as const`: property names are literal in the inferred type either way
 * (which is all {@link ChartColorTokenPath} needs), while the values stay
 * mutable `string`s so Panda's own token types accept them.
 *
 * Frozen because it is a module-scope singleton that both Panda configs and the
 * package barrel hand out by reference. The freeze is SHALLOW on purpose: it
 * stops a namespace being replaced or added (`tokens.identity = …`,
 * `Object.assign(tokens, …)`), which is the plausible accident, and stops
 * nothing deeper. A deep freeze would trade that for a real risk — Panda's
 * config merge walks these same nested objects, and both configs pass
 * `.chart`/`.identity` in by reference rather than copying, so a frozen leaf
 * could throw inside a consumer's codegen.
 */
export const chartColorSemanticTokens = Object.freeze({
  chart: {
    axis: {
      value: { base: '{colors.neutral.500}', _dark: '{colors.neutral.400}' },
    },
    grid: {
      value: { base: '{colors.neutral.200}', _dark: '{colors.neutral.700}' },
    },
    area: {
      primary: {
        value: { base: '{colors.blue.100}', _dark: '{colors.blue.900}' },
      },
    },
    // Role ramp. `positive`/`critical` are SEMANTIC members, not ordinal slots
    // 4-5; `quaternary`/`quinary` are the ordinal continuation past `tertiary`.
    series: {
      primary: {
        value: { base: '{colors.blue.600}', _dark: '{colors.blue.300}' },
      },
      secondary: {
        value: { base: '{colors.teal.600}', _dark: '{colors.teal.300}' },
      },
      tertiary: {
        value: { base: '{colors.violet.600}', _dark: '{colors.violet.300}' },
      },
      positive: {
        value: { base: '{colors.green.600}', _dark: '{colors.green.300}' },
      },
      critical: {
        value: { base: '{colors.red.600}', _dark: '{colors.red.300}' },
      },
      quaternary: {
        value: { base: '{colors.amber.600}', _dark: '{colors.amber.300}' },
      },
      quinary: {
        value: { base: '{colors.pink.600}', _dark: '{colors.pink.300}' },
      },
    },
  },
  /**
   * Identity palette: a stable color PER ENTITY, distinct from the role ramp
   * above. An entity's color is the same in a bar, a line, and a legend
   * whatever role it plays. `useIdentityPalette` hashes an id to one of these
   * slots and returns `var(--colors-identity-N)`, so SVG and CSS both theme
   * (and dark-mode) correctly. Eight visually distinct hues, dark-aware.
   */
  identity: {
    '1': { value: { base: '{colors.blue.600}', _dark: '{colors.blue.400}' } },
    '2': { value: { base: '{colors.teal.600}', _dark: '{colors.teal.400}' } },
    '3': {
      value: { base: '{colors.violet.600}', _dark: '{colors.violet.400}' },
    },
    '4': { value: { base: '{colors.amber.600}', _dark: '{colors.amber.400}' } },
    '5': { value: { base: '{colors.pink.600}', _dark: '{colors.pink.400}' } },
    '6': { value: { base: '{colors.cyan.600}', _dark: '{colors.cyan.400}' } },
    '7': { value: { base: '{colors.lime.600}', _dark: '{colors.lime.400}' } },
    '8': {
      value: { base: '{colors.orange.600}', _dark: '{colors.orange.400}' },
    },
  },
});

/**
 * A leaf of the token tree above: a node carrying a `value`.
 *
 * Exactly as loose as the runtime leaf predicate in `chartColorTokens.test.ts`
 * (`'value' in node`), deliberately: the two are one definition of "leaf", split
 * across the type level and the runtime only because neither can express the
 * other.
 *
 * WHY NOT NARROWER: a stricter shape — say `{ value: { base: string; _dark:
 * string } }` — makes a token that does not match DISAPPEAR from
 * {@link ChartColorTokenPath} rather than fail loudly. {@link TokenPathsOf}
 * keeps walking into the non-matching node, bottoms out in `keyof string` and
 * then in a method type whose `keyof` is `never`, and the whole branch collapses
 * to `never`. A token written without a `_dark` variant would simply not be in
 * the union — no error, no garbage member, no token. Nothing at the type level
 * can report that, which is why the test walks the tree at RUNTIME and compares
 * the result against {@link chartColorTokenPaths}.
 *
 * The `_dark` requirement is real; it is enforced where it can be enforced
 * without splitting this definition, by the test that resolves every path and
 * asserts a `{ base, _dark }` pair.
 */
type ChartColorTokenLeaf = { value: unknown };

/**
 * Every dotted path to a leaf of `T`, e.g. `'chart.series.primary'`. Walks the
 * tree rather than restating the names, so adding a token above extends
 * {@link ChartColorTokenPath} with no second edit.
 */
type TokenPathsOf<T> = {
  [Key in keyof T & string]: T[Key] extends ChartColorTokenLeaf
    ? Key
    : `${Key}.${TokenPathsOf<T[Key]>}`;
}[keyof T & string];

/**
 * The union of chart color token paths — `'chart.axis' | 'chart.grid' |
 * 'chart.area.primary' | 'chart.series.primary' | … | 'identity.8'`.
 *
 * `@archon-research/charting` mirrors this union as its `ChartColorToken` type
 * (it cannot import it: the design system is an OPTIONAL peer there, so a
 * type-only import would silently degrade to `any` under `skipLibCheck` for
 * consumers who install charting alone). A test in that package asserts the two
 * lists stay identical — see `packages/charting/DESIGN.md`.
 */
export type ChartColorTokenPath = TokenPathsOf<typeof chartColorSemanticTokens>;

/**
 * Every {@link ChartColorTokenPath} as runtime data, in declaration order — the
 * list a cross-package sync test or a token-inspector UI enumerates.
 *
 * Written out rather than walked out of the tree at runtime. A walk needs an
 * `as ChartColorTokenPath[]` on its `string[]` result, because TypeScript cannot
 * connect an `Object.entries` recursion to the type-level recursion above — and
 * that assertion is exactly what would LAUNDER a disagreement between the two
 * notions of "leaf" into a plausible-looking list.
 *
 * Nothing is asserted away instead. Each entry here is checked against the union
 * by the annotation, so a path the tree cannot produce fails to compile; and
 * `chartColorTokens.test.ts` runs the walk as a test oracle, so a token added
 * above and not here fails that test.
 */
export const chartColorTokenPaths: ChartColorTokenPath[] = [
  'chart.axis',
  'chart.grid',
  'chart.area.primary',
  'chart.series.primary',
  'chart.series.secondary',
  'chart.series.tertiary',
  'chart.series.positive',
  'chart.series.critical',
  'chart.series.quaternary',
  'chart.series.quinary',
  'identity.1',
  'identity.2',
  'identity.3',
  'identity.4',
  'identity.5',
  'identity.6',
  'identity.7',
  'identity.8',
];

/**
 * The CSS custom-property name Panda emits for a token path, e.g.
 * `'chart.series.primary'` → `'--colors-chart-series-primary'`. Panda flattens
 * the token path onto the `colors` namespace with `-` separators.
 */
export function chartColorCssVarName(path: ChartColorTokenPath): string {
  return `--colors-${path.replaceAll('.', '-')}`;
}
