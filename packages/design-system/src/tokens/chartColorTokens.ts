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
 */
export const chartColorSemanticTokens = {
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
};

/** A leaf in the token tree above: a dark-aware semantic color token. */
type ChartColorTokenLeaf = { value: { base: string; _dark: string } };

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

/** Narrows a tree node to a token leaf. */
function isTokenLeaf(node: unknown): node is ChartColorTokenLeaf {
  return typeof node === 'object' && node !== null && 'value' in node;
}

/** Depth-first collection of dotted leaf paths, in declaration order. */
function collectTokenPaths(
  node: Record<string, unknown>,
  prefix: string,
  out: string[],
): void {
  for (const [key, child] of Object.entries(node)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (isTokenLeaf(child)) {
      out.push(path);
    } else {
      collectTokenPaths(child as Record<string, unknown>, path, out);
    }
  }
}

/**
 * Every {@link ChartColorTokenPath} as runtime data, in declaration order — the
 * list a cross-package sync test or a token-inspector UI enumerates.
 */
export const chartColorTokenPaths: ChartColorTokenPath[] = (() => {
  const paths: string[] = [];
  collectTokenPaths(chartColorSemanticTokens, '', paths);
  return paths as ChartColorTokenPath[];
})();

/**
 * The CSS custom-property name Panda emits for a token path, e.g.
 * `'chart.series.primary'` → `'--colors-chart-series-primary'`. Panda flattens
 * the token path onto the `colors` namespace with `-` separators.
 */
export function chartColorCssVarName(path: ChartColorTokenPath): string {
  return `--colors-${path.replaceAll('.', '-')}`;
}
