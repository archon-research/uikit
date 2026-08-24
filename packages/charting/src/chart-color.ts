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
 * This is the package's authoritative list of token NAMES. `ChartColorToken`
 * derives from its keys, so `'chart.series.primary'` autocompletes wherever a
 * chart color is accepted, and a misspelling of it is a compile error wherever
 * `ChartColorToken` itself is the annotation. On a `ChartColor` prop it is not —
 * the `(string & {})` arm makes `'chart.series.primry'` legal — so the same list
 * also backs the dev-time unknown-path warning at the bottom of this file.
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
 * Prefer the token form — `color="chart.series.primary"` — which the editor
 * autocompletes from the union below. Note what the `(string & {})` arm costs:
 * a MISSPELLED token path (`'chart.series.primry'`) is a legal `ChartColor`,
 * because it is a legal string. The compile error only lands where the narrower
 * `ChartColorToken` is the annotation. A typo'd path is instead caught at
 * runtime, in development, by {@link resolveChartColor}'s guard.
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

/**
 * Matches a string SHAPED like a token path in the two namespaces this package
 * owns. Reached only after the exact-token lookup in {@link resolveChartColor}
 * has already missed, so a match here is a path that does not exist — the
 * likeliest way to misuse a `ChartColor` prop, since the `(string & {})` arm of
 * the type lets `'chart.series.primry'` compile.
 *
 * False positives are impossible rather than unlikely: no CSS color syntax
 * (hex, `rgb()`, `var()`, `color-mix()`, `url()`, a named color) starts with
 * `chart.` or `identity.`, and both namespaces are enumerated in full above.
 */
const ownedTokenPathPattern = /^(?:chart|identity)\./;

/** Warned-once keys, so a color in a per-frame render loop logs a single line. */
const warnedColors = new Set<string>();

/** Logs `message` the first time `key` is seen. */
function warnOnce(key: string, message: string): void {
  if (warnedColors.has(key)) return;
  warnedColors.add(key);
  console.warn(message);
}

/**
 * Dev-only: turn a misspelled chart token into a console signal. Without this a
 * typo is invisible in both of its forms — a typo'd custom property makes the
 * browser drop the declaration, and a typo'd token PATH reaches the SVG
 * attribute verbatim as an invalid color. Either way the mark renders with the
 * SVG default (black, or nothing at all).
 */
function warnUnknownChartColor(color: string): void {
  if (ownedTokenPathPattern.test(color)) {
    warnOnce(
      color,
      `[charting] "${color}" is not a known chart color token. It reached an ` +
        `SVG attribute verbatim, which is not a valid color, so the mark will ` +
        `render unstyled. Check the path against ChartColorToken — the ` +
        `\`(string & {})\` arm of \`ChartColor\` means a misspelled token ` +
        `path still compiles.`,
    );
    return;
  }
  const match = ownedVarPattern.exec(color);
  if (!match) return;
  const varName = match[1]!;
  if (knownCssVarNames.has(varName)) return;
  warnOnce(
    varName,
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
 * In development it also warns — once per offending value — for the two ways a
 * chart color can be misspelled: a `chart.*` / `identity.*` PATH that is not a
 * token (which the `(string & {})` arm of {@link ChartColor} lets compile), and
 * a raw `var(--colors-chart-*)` / `var(--colors-identity-*)` string naming a
 * custom property that does not exist. Production builds strip both checks.
 */
export function resolveChartColor(color: ChartColor): string {
  if (Object.hasOwn(chartColorTokens, color)) {
    return chartColorTokens[color as ChartColorToken];
  }
  if (IS_DEV_WARNING_ENABLED) warnUnknownChartColor(color);
  return color;
}
