/**
 * @vitest-environment jsdom
 *
 * Renders, because the defect this guards is only visible in the DOM: the item
 * fill is an *inline* background, so what matters is the value that actually
 * reaches each item element — not what a module-level constant says.
 *
 * jsdom keeps a `var()` chain verbatim and never resolves it (no cascade, no
 * custom-property registry), so the chain is resolved here against the design
 * system's own token definitions, imported rather than transcribed. Only the
 * raw neutral ramp is spelled out, and that comes from Panda's preset.
 *
 * Separation from the ground is then *computed*, not asserted as string
 * inequality: the blocks carry an `opacity`, so what a browser paints is the
 * fill composited toward its ground, and two different hexes can still land a
 * hair apart. See {@link MIN_FILL_CONTRAST}.
 */
import { cleanup, render } from '@testing-library/react';
import { createElement, type CSSProperties } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { borderColors, surfaceColors } from '../tokens/sharedThemeTokens.js';
import {
  SKELETON_FILL_VAR,
  SKELETON_PULSE_PEAK_OPACITY,
} from './skeletonPulse.js';
import { SkeletonStack, type SkeletonStackProps } from './SkeletonStack.js';

type Theme = 'base' | '_dark';

const THEMES: readonly Theme[] = ['base', '_dark'];

/** `@pandacss/preset-panda`'s neutral ramp — every token below resolves into it. */
const NEUTRAL_HEX: Record<string, string> = {
  '50': '#fafafa',
  '100': '#f5f5f5',
  '200': '#e5e5e5',
  '300': '#d4d4d4',
  '400': '#a3a3a3',
  '500': '#737373',
  '600': '#525252',
  '700': '#404040',
  '800': '#262626',
  '900': '#171717',
  '950': '#0a0a0a',
};

type SemanticToken = { value: { base: string; _dark: string } };

/**
 * The custom properties the design-system preset emits, keyed by the CSS name
 * Panda generates for them. Anything not listed here is undeclared at runtime,
 * so a `var()` reading it falls through to its fallback — which is exactly how
 * the consumer-override hook (`--skeleton-fill`) behaves when nobody sets it.
 */
const DECLARED_PROPERTIES: Record<string, SemanticToken> = {
  '--colors-surface-canvas': surfaceColors.canvas,
  '--colors-surface-default': surfaceColors.default,
  '--colors-surface-subtle': surfaceColors.subtle,
  '--colors-border-subtle': borderColors.subtle,
};

/** `{colors.neutral.300}` / `{colors.white}` -> a hex a browser would paint. */
function paletteHex(reference: string): string {
  if (reference === '{colors.white}') return '#ffffff';
  const step = /^\{colors\.neutral\.(\d+)\}$/.exec(reference)?.[1];
  const hex = step === undefined ? undefined : NEUTRAL_HEX[step];
  if (hex === undefined) {
    throw new Error(`Unmapped palette reference: ${reference}`);
  }
  return hex;
}

function tokenHex(token: SemanticToken, theme: Theme): string {
  return paletteHex(token.value[theme]);
}

type Resolution = {
  /** Properties a consumer declared, which win over any fallback. */
  overrides?: Record<string, string>;
  /**
   * Resolve as if the preset emitted nothing, so every read falls through to
   * its fallback — a consumer who never installed the design-system preset, or
   * who set Panda's `prefix` (which renames every generated variable, so every
   * `var(--colors-*)` in this package misses).
   */
  withoutPreset?: boolean;
};

/**
 * Resolves a declared CSS value the way a browser's cascade would: a `var()`
 * whose property is declared takes that property's value for the theme, an
 * undeclared one falls through to its fallback, `light-dark()` picks the limb
 * matching the theme's `color-scheme`, and a literal passes through.
 */
function resolveCssValue(
  value: string,
  theme: Theme,
  { overrides = {}, withoutPreset = false }: Resolution = {},
): string {
  const trimmed = value.trim();
  const recurse = (next: string) =>
    resolveCssValue(next, theme, { overrides, withoutPreset });

  // `light-dark(<light>, <dark>)` — the last-resort tier of `SKELETON_FILL`.
  // Split on the top-level comma so a limb may itself be a function call.
  const lightDark = /^light-dark\(([\s\S]+)\)$/.exec(trimmed);
  if (lightDark) {
    const limbs = splitTopLevel(lightDark[1] ?? '');
    if (limbs.length !== 2) {
      throw new Error(`Malformed light-dark(): ${trimmed}`);
    }
    return recurse(limbs[theme === '_dark' ? 1 : 0] ?? '');
  }

  const call = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/.exec(trimmed);
  if (!call) return trimmed;

  const property = call[1] ?? '';
  const fallback = call[2];

  const override = overrides[property];
  if (override !== undefined) return recurse(override);

  const declared = withoutPreset ? undefined : DECLARED_PROPERTIES[property];
  if (declared) return tokenHex(declared, theme);

  if (fallback === undefined) {
    throw new Error(`No fallback for undeclared property: ${property}`);
  }
  return recurse(fallback);
}

/** Splits on commas that aren't inside parentheses. */
function splitTopLevel(args: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < args.length; index += 1) {
    const char = args[index];
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    else if (char === ',' && depth === 0) {
      parts.push(args.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(args.slice(start));
  return parts.map((part) => part.trim());
}

// ─── WCAG-style contrast, computed rather than eyeballed ─────────────────────
// Local implementations on purpose: the package ships no colour math, and
// three formulas do not justify a dependency.

type Rgb = readonly [number, number, number];

/** `#rgb` / `#rrggbb` -> 0–255 channels. */
function hexChannels(hex: string): Rgb {
  const body = hex.replace('#', '');
  const full =
    body.length === 3 ? [...body].map((char) => char + char).join('') : body;
  if (!/^[0-9a-f]{6}$/i.test(full)) {
    throw new Error(`Not a plain hex colour: ${hex}`);
  }
  const channel = (at: number) => parseInt(full.slice(at, at + 2), 16);
  return [channel(0), channel(2), channel(4)];
}

/** WCAG relative luminance. */
function relativeLuminance(rgb: Rgb): number {
  const linear = (channel: number) => {
    const unit = channel / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2])
  );
}

/** WCAG contrast ratio: 1 for identical colours, 21 for black on white. */
function contrastRatio(a: Rgb, b: Rgb): number {
  const one = relativeLuminance(a);
  const other = relativeLuminance(b);
  return (Math.max(one, other) + 0.05) / (Math.min(one, other) + 0.05);
}

/**
 * `foreground` painted over `background` at `alpha` — what a browser actually
 * puts on screen, since every skeleton block carries an `opacity`.
 */
function compositeOver(foreground: Rgb, background: Rgb, alpha: number): Rgb {
  const blend = (over: number, under: number) =>
    over * alpha + under * (1 - alpha);
  return [
    blend(foreground[0], background[0]),
    blend(foreground[1], background[1]),
    blend(foreground[2], background[2]),
  ];
}

/** Every ground a consumer can build from the system's own elevation ramp. */
const SURFACE_STEPS = {
  canvas: surfaceColors.canvas,
  default: surfaceColors.default,
  subtle: surfaceColors.subtle,
};

/**
 * Contrast floor for a skeleton block against its ground, composited at the
 * block's resting opacity.
 *
 * A REGRESSION RATCHET, NOT AN ACCESSIBILITY CLAIM. None of these ratios meets
 * a WCAG text threshold and none needs to — the blocks carry no content. The
 * floor sits just under the worst ratio the current fill actually achieves
 * (light `surface.subtle`, 1.295:1; the best is dark `surface.canvas` at
 * 1.686:1), so a future re-tone that quietly moves the fill *toward* a surface
 * fails here instead of shipping a near-invisible placeholder. Raise it if the
 * fill improves; do not lower it to make a change pass.
 *
 * Measured at {@link SKELETON_PULSE_PEAK_OPACITY} because that is both the
 * resting opacity and the brightest the pulse ever gets — the trough (0.45)
 * necessarily reads closer to the ground (~1.14:1 in the same worst pairing)
 * and is a property of the animation, not of the fill this floor guards.
 */
const MIN_FILL_CONTRAST = 1.25;

/** What Panda compiles `bg: 'surface.subtle'` down to. */
const SURFACE_SUBTLE_GROUND = 'var(--colors-surface-subtle)';

/** Renders a skeleton inside a ground and returns each item's inline fill. */
function renderOnGround(ground: string): string[] {
  const { container } = render(
    createElement(
      'div',
      { style: { background: ground } },
      createElement<SkeletonStackProps>(SkeletonStack, { count: 3 }),
    ),
  );

  const wrapper = container.firstElementChild?.firstElementChild;
  const items = [...(wrapper?.children ?? [])].filter(
    (child): child is HTMLElement => child.tagName === 'DIV',
  );
  expect(items).toHaveLength(3);
  return items.map((item) => item.style.background);
}

/** The first item's fill, as a plain string the resolver can take. */
function fillOnGround(ground: string): string {
  const [fill] = renderOnGround(ground);
  if (fill === undefined) throw new Error('SkeletonStack rendered no items');
  return fill;
}

afterEach(cleanup);

describe('SkeletonStack item fill', () => {
  it('differs from a surface.subtle ground in both themes', () => {
    // The regression: the items used to be filled with `surface.subtle`
    // itself, so a recessed card — a surface the design system recommends —
    // showed a blank area where the loading placeholders should be.
    for (const fill of renderOnGround(SURFACE_SUBTLE_GROUND)) {
      for (const theme of THEMES) {
        expect(resolveCssValue(fill, theme)).not.toBe(
          resolveCssValue(SURFACE_SUBTLE_GROUND, theme),
        );
      }
    }
  });

  // Supersedes a plain `!==` against each surface, which passed at 1.001:1 and
  // took no account of the `opacity` every block carries — the two things that
  // made the old assertion unable to see a near-invisible placeholder.
  it('clears the contrast floor against every surface step, composited at rest opacity', () => {
    const fill = fillOnGround(SURFACE_SUBTLE_GROUND);

    for (const theme of THEMES) {
      const painted = hexChannels(resolveCssValue(fill, theme));

      for (const [name, surface] of Object.entries(SURFACE_STEPS)) {
        const ground = hexChannels(tokenHex(surface, theme));
        const ratio = contrastRatio(
          compositeOver(painted, ground, SKELETON_PULSE_PEAK_OPACITY),
          ground,
        );

        expect(
          ratio,
          `${theme} / surface.${name}: ${ratio.toFixed(3)}:1`,
        ).toBeGreaterThanOrEqual(MIN_FILL_CONTRAST);
      }
    }
  });

  it('defaults to the border.subtle token in both themes', () => {
    const fill = fillOnGround(SURFACE_SUBTLE_GROUND);

    expect(resolveCssValue(fill, 'base')).toBe(
      tokenHex(borderColors.subtle, 'base'),
    );
    expect(resolveCssValue(fill, '_dark')).toBe(
      tokenHex(borderColors.subtle, '_dark'),
    );
  });

  it('yields to a consumer-declared --skeleton-fill', () => {
    // A class can never outrank the item's inline background, so the override
    // path is the custom property that background reads.
    const fill = fillOnGround(SURFACE_SUBTLE_GROUND);

    expect(
      resolveCssValue(fill, 'base', {
        overrides: { [SKELETON_FILL_VAR]: '#ff00ff' },
      }),
    ).toBe('#ff00ff');
  });

  // The regression: the last-resort tier was a bare `#d4d4d4`, so a consumer
  // without the preset (or with a Panda `prefix`, which renames the token
  // variable and makes the middle tier miss) got a light-grey block on a dark
  // surface — 9.7:1 against `surface.canvas`, a glaring slab rather than a
  // placeholder. `light-dark()` follows the consumer's `color-scheme` instead.
  it('falls back to a theme-aware colour when the preset tokens are absent', () => {
    const fill = fillOnGround(SURFACE_SUBTLE_GROUND);
    const withoutPreset = true;

    expect(resolveCssValue(fill, 'base', { withoutPreset })).toBe('#d4d4d4');
    expect(resolveCssValue(fill, '_dark', { withoutPreset })).toBe('#404040');
  });

  // The last-resort tier is not a second opinion on the palette: it is the
  // `border.subtle` pair spelled literally, for elements the token never
  // reached. If the token moves and the literal doesn't, the two consumers see
  // different skeletons.
  it('spells the last-resort fallback as the border.subtle values themselves', () => {
    const fill = fillOnGround(SURFACE_SUBTLE_GROUND);

    for (const theme of THEMES) {
      expect(resolveCssValue(fill, theme, { withoutPreset: true })).toBe(
        tokenHex(borderColors.subtle, theme),
      );
    }
  });

  it('takes a --skeleton-fill from the style prop onto the wrapper the items inherit from', () => {
    const { container } = render(
      createElement<SkeletonStackProps>(SkeletonStack, {
        count: 1,
        style: { [SKELETON_FILL_VAR]: '#ff00ff' } as CSSProperties,
      }),
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.getPropertyValue(SKELETON_FILL_VAR)).toBe('#ff00ff');
  });
});
