import { describe, expect, it } from 'vitest';

import { designSystemPandaConfig } from '../panda.shared.js';
import { designSystemPreset } from './panda-preset.js';
import { borderWidthTokens } from './tokens/sharedThemeTokens.js';

const borderWidthNames = Object.keys(borderWidthTokens);

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
