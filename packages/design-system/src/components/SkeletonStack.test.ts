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
 */
import { cleanup, render } from '@testing-library/react';
import { createElement, type CSSProperties } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { borderColors, surfaceColors } from '../tokens/sharedThemeTokens.js';
import { SKELETON_FILL_VAR } from './skeletonPulse.js';
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

/**
 * Resolves a declared CSS value the way a browser's cascade would: a `var()`
 * whose property is declared takes that property's value for the theme, an
 * undeclared one falls through to its fallback, and a literal passes through.
 */
function resolveCssValue(
  value: string,
  theme: Theme,
  overrides: Record<string, string> = {},
): string {
  const call = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/.exec(value.trim());
  if (!call) return value.trim();

  const property = call[1] ?? '';
  const fallback = call[2];

  const override = overrides[property];
  if (override !== undefined) {
    return resolveCssValue(override, theme, overrides);
  }

  const declared = DECLARED_PROPERTIES[property];
  if (declared) return tokenHex(declared, theme);

  if (fallback === undefined) {
    throw new Error(`No fallback for undeclared property: ${property}`);
  }
  return resolveCssValue(fallback, theme, overrides);
}

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

  it('differs from every surface step, so no ground can swallow it', () => {
    const fill = fillOnGround(SURFACE_SUBTLE_GROUND);

    for (const theme of THEMES) {
      const resolved = resolveCssValue(fill, theme);
      for (const surface of [
        surfaceColors.canvas,
        surfaceColors.default,
        surfaceColors.subtle,
      ]) {
        expect(resolved).not.toBe(tokenHex(surface, theme));
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
      resolveCssValue(fill, 'base', { [SKELETON_FILL_VAR]: '#ff00ff' }),
    ).toBe('#ff00ff');
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
