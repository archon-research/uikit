import { describe, expect, it } from 'vitest';

import { designSystemPandaConfig } from '../panda.shared.js';
import { designSystemPreset } from './panda-preset.js';
import {
  designSystemRecipes,
  designSystemSlotRecipes,
} from './recipes/sharedRecipes.js';
import { borderWidthTokens } from './tokens/sharedThemeTokens.js';

const borderWidthNames = Object.keys(borderWidthTokens);

/** Any `border*Width` style property — deliberately NOT `outlineWidth`. */
const BORDER_WIDTH_PROPERTY = /^border[A-Za-z]*Width$/;

/**
 * Every `border*Width` value anywhere in a recipe, however deep — variants,
 * compound variants, slots and nested selectors are all just plain objects, so
 * one walk covers the lot without having to model Panda's recipe shape.
 */
function collectBorderWidthValues(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(collectBorderWidthValues);
  if (typeof node !== 'object' || node === null) return [];
  return Object.entries(node).flatMap(([key, child]) =>
    BORDER_WIDTH_PROPERTY.test(key) && typeof child === 'string'
      ? [child]
      : collectBorderWidthValues(child),
  );
}

describe('borderWidths token scale', () => {
  // Panda ships no `borderWidths` tokens of its own, so this scale existing at
  // all is the whole point: without it a consumer running `strictTokens` has to
  // write every border as an arbitrary `[value]`.
  it('is registered on the preset', () => {
    expect(designSystemPreset.theme?.extend?.tokens?.borderWidths).toBe(
      borderWidthTokens,
    );
  });

  // The failure `tokens/sharedThemeTokens.ts` exists to prevent: a scale added
  // to the published preset and not to the config this repo's own preview
  // builds with, so every `var(--border-widths-*)` read there resolves to
  // nothing — silently, exactly as `identity.*` once did.
  it('is registered identically on the internal shared config', () => {
    expect(designSystemPandaConfig.theme?.extend?.tokens?.borderWidths).toBe(
      designSystemPreset.theme?.extend?.tokens?.borderWidths,
    );
  });

  it('covers the hairline through the accent rail', () => {
    expect(borderWidthTokens).toEqual({
      none: { value: '0' },
      hairline: { value: '1px' },
      strong: { value: '2px' },
      accent: { value: '3px' },
    });
  });

  // `thin`/`medium`/`thick` are CSS-wide `border-width` keywords: a token by
  // one of those names that failed to register would render as a plausible
  // width rather than failing loudly, so the scale must not use them.
  it('avoids the CSS-wide border-width keywords', () => {
    expect(borderWidthNames).not.toContain('thin');
    expect(borderWidthNames).not.toContain('medium');
    expect(borderWidthNames).not.toContain('thick');
  });
});

describe('shared recipes', () => {
  // Pins the migration off hardcoded widths. Recipe values are typed as plain
  // strings, so nothing at the type level can tell `'hairline'` from `'1px'` or
  // from a typo — this walk is the only thing that can.
  it('express every border width as a borderWidths token', () => {
    const used = [
      ...collectBorderWidthValues(designSystemRecipes),
      ...collectBorderWidthValues(designSystemSlotRecipes),
    ];

    expect(used.length).toBeGreaterThan(0);
    for (const value of used) {
      expect(borderWidthNames, value).toContain(value);
    }
  });
});
