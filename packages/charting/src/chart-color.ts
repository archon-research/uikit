// Ambient, package-local declaration — this package's tsconfig has no
// `"types": ["node"]` reference, so `process` isn't otherwise a known global.
// Declaring it as possibly `undefined` keeps the `typeof process` guard below
// meaningful to the type checker without pulling in `@types/node`. Mirrors
// `IS_DEV_WARNING_ENABLED` in the design system's `hooks/devWarning.ts`.
declare const process: { env?: { NODE_ENV?: string } } | undefined;

/**
 * `true` outside a production build; gates the dev-only unknown-token warning
 * below. Bundlers statically replace `process.env.NODE_ENV`, so a production
 * build collapses this to `false` and dead-code-eliminates the warning path —
 * the guard costs nothing in shipped code.
 */
const IS_DEV_WARNING_ENABLED =
  typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production';

/**
 * Every chart color token, keyed by its design-system token path, mapped to the
 * CSS-variable string that reads it.
 *
 * This is the package's authoritative list of token NAMES: `ChartColorToken`
 * derives from its keys, so a chart color prop accepts `'chart.series.primary'`
 * as a checked literal and rejects `'chart.series.primry'` at compile time.
 *
 * The names are duplicated from `chartColorSemanticTokens` in the design system
 * rather than imported from it. That is deliberate: the design system is an
 * OPTIONAL peer dependency here (charting renders on its fallbacks without it),
 * and a type-only import would put an unresolvable module reference in this
 * package's published `.d.ts` — which, under the `skipLibCheck` that nearly
 * every consumer runs, degrades the union to `any` silently instead of failing
 * loudly. That is the same class of silent failure this type exists to prevent.
 * `chart-color.sync.test.ts` asserts this list and the design system's stay
 * identical, so the duplication cannot drift unnoticed. See DESIGN.md.
 *
 * Distinct from `chartTokens` in `theme.ts`, which is a small ROLE-keyed map of
 * the values this package's own components reach for (including non-chart
 * namespaces like `surface` and `label`, and the `color-mix` band tints).
 */
export const chartColorTokens = {
  // Chart chrome.
  //
  // NOTE ON FALLBACKS: the hexes below are what a chart renders when the design
  // system is absent. The eight entries that predate this table are pinned to
  // their original values so `seriesColor.*`/`chartTokens.*` keep returning
  // byte-identical strings; several of them (e.g. `#155eef` for what is now
  // `blue.600`) trail the current Panda palette. Correcting them changes only
  // the no-design-system rendering path and is left to its own change. The
  // entries added with this table use the palette's real values.
  'chart.axis': 'var(--colors-chart-axis, #6b7280)',
  'chart.grid': 'var(--colors-chart-grid, #e5e7eb)',
  'chart.area.primary': 'var(--colors-chart-area-primary, #dbeafe)',

  // Role ramp. `positive`/`critical` are semantic, not ordinal slots 4-5;
  // `quaternary`/`quinary` continue the ordinal sequence past `tertiary`.
  'chart.series.primary': 'var(--colors-chart-series-primary, #155eef)',
  'chart.series.secondary': 'var(--colors-chart-series-secondary, #0f766e)',
  'chart.series.tertiary': 'var(--colors-chart-series-tertiary, #7c3aed)',
  'chart.series.positive': 'var(--colors-chart-series-positive, #16a34a)',
  'chart.series.critical': 'var(--colors-chart-series-critical, #dc2626)',
  'chart.series.quaternary': 'var(--colors-chart-series-quaternary, #d97706)',
  'chart.series.quinary': 'var(--colors-chart-series-quinary, #db2777)',

  // Identity palette: a stable color per ENTITY, not per role. `useIdentityPalette`
  // in the design system hashes an id to one of these slots.
  'identity.1': 'var(--colors-identity-1, #2563eb)',
  'identity.2': 'var(--colors-identity-2, #0d9488)',
  'identity.3': 'var(--colors-identity-3, #7c3aed)',
  'identity.4': 'var(--colors-identity-4, #d97706)',
  'identity.5': 'var(--colors-identity-5, #db2777)',
  'identity.6': 'var(--colors-identity-6, #0891b2)',
  'identity.7': 'var(--colors-identity-7, #65a30d)',
  'identity.8': 'var(--colors-identity-8, #ea580c)',
} as const;

/** A design-system chart color token path, e.g. `'chart.series.primary'`. */
export type ChartColorToken = keyof typeof chartColorTokens;

/**
 * The type every color-accepting prop in this package takes.
 *
 * Prefer the token form — `color="chart.series.primary"` — which is checked
 * against the design system's token contract, so a typo is a compile error
 * instead of an unresolved `var()` and a silently dropped CSS declaration.
 *
 * Any other string still works as the escape hatch (a raw `var(...)`, a hex, a
 * `color-mix(...)`, a gradient `url(#id)`), for one-off colors and for values
 * computed at runtime — `useIdentityPalette` returns such strings. The
 * `string & {}` intersection is the standard trick for "any string, but keep
 * the literal union's autocomplete": a bare `string` in the union would absorb
 * the literals and lose every suggestion.
 */
export type ChartColor = ChartColorToken | (string & {});

/**
 * The CSS-variable string for a token path. Use it where a `ChartColor` prop
 * isn't available — a `style` object, a design-system `css()` call, an SVG
 * gradient stop:
 *
 * ```tsx
 * <stop offset="0%" stopColor={chartColorToken('chart.series.primary')} />
 * ```
 *
 * Inside this package's own props just pass the token name; the prop resolves
 * it for you.
 */
export function chartColorToken(name: ChartColorToken): string {
  return chartColorTokens[name];
}

/** The CSS custom-property name a token path reads, for the dev guard below. */
function cssVarName(path: string): string {
  return `--colors-${path.replaceAll('.', '-')}`;
}

const knownCssVarNames: ReadonlySet<string> = new Set(
  Object.keys(chartColorTokens).map(cssVarName),
);

/**
 * Matches a `var()` read of a custom property in the two namespaces this
 * package owns the contract for. Restricted to those namespaces on purpose: a
 * `var(--colors-surface-default)` or `var(--colors-text-muted)` is a legitimate
 * color to pass, and charting has no way to know the design system's full color
 * namespace — warning on those would be noise. Within `--colors-chart-*` and
 * `--colors-identity-*` this package DOES know every valid name, so anything
 * else there is a typo.
 */
const ownedVarPattern = /^var\(\s*(--colors-(?:chart|identity)-[\w-]*)/;

/** Warned-once keys, so a color in a per-frame render loop logs a single line. */
const warnedColors = new Set<string>();

/**
 * Dev-only: turn a misspelled chart token into a console signal. Without this a
 * typo'd custom property is invisible — the browser drops the declaration and
 * the mark renders with the SVG default (black, or nothing at all).
 */
function warnUnknownChartColor(color: string): void {
  const match = ownedVarPattern.exec(color);
  if (!match) return;
  const varName = match[1]!;
  if (knownCssVarNames.has(varName)) return;
  if (warnedColors.has(varName)) return;
  warnedColors.add(varName);
  console.warn(
    `[charting] "${varName}" is not a known chart color token, so this ` +
      `declaration will be dropped and the mark will render unstyled. Pass a ` +
      `token name instead of a raw var() string (e.g. ` +
      `color="chart.series.primary") to have this checked at compile time.`,
  );
}

/**
 * THE boundary resolver: every color-accepting prop in this package funnels its
 * value through here before it reaches an SVG attribute. A token name becomes
 * its `var(...)` string; anything else passes through untouched.
 *
 * In development it also warns (once per offending custom property) for a raw
 * `var(--colors-chart-*)` / `var(--colors-identity-*)` string naming a token
 * that does not exist. Production builds strip that check entirely.
 */
export function resolveChartColor(color: ChartColor): string {
  if (Object.hasOwn(chartColorTokens, color)) {
    return chartColorTokens[color as ChartColorToken];
  }
  if (IS_DEV_WARNING_ENABLED) warnUnknownChartColor(color);
  return color;
}
