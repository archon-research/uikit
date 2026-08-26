import { definePreset } from '@pandacss/dev';

import {
  designSystemRecipes,
  designSystemSlotRecipes,
} from './recipes/sharedRecipes.js';
import { chartColorSemanticTokens } from './tokens/chartColorTokens.js';
import {
  animationTokens,
  bgColors,
  borderColors,
  categoricalColors,
  colorPaletteRoleTokens,
  colorSchemeGlobalCss,
  elevationShadows,
  fgColors,
  heatColors,
  interactiveColors,
  microFontSizes,
  motionKeyframes,
  overlayColors,
  scrollbarColors,
  surfaceColors,
  textColors,
  zIndexTokens,
} from './tokens/sharedThemeTokens.js';

/**
 * BREAKING VALUE-CHANGES (batch into the next major):
 * This preset is reconciled onto the shared config's `neutral.*` family so the
 * published tokens match what the components actually render. The following
 * EXISTING token values change (rendered output differs); everything else in
 * this file is purely additive.
 *
 *   - Base palette unified `gray.*` -> `neutral.*` across surface/text/border/
 *     interactive (previously the preset used `gray.*`).
 *   - `interactive.selected`: grey wash (`gray.100/gray.800`) ->
 *     blue-tinted state (`blue.100/blue.900`) so selection reads as active.
 *   - `surface.default` (raised panel) DARK value: `gray.950` (the DARKEST
 *     step, page-like) -> `neutral.900`. Previously elevation INVERTED in dark
 *     mode: the "raised" panel was the darkest value on the page. It is now
 *     lighter than the canvas in both themes.
 *   - `surface.canvas` / `bg.canvas` LIGHT value: `white` -> `neutral.50` so the
 *     page sits behind (recedes from) raised white panels — a real 3-step ramp.
 *   - `surface.subtle` (recessed inset): `gray.50/gray.900` ->
 *     `neutral.100/neutral.800`.
 *
 * ELEVATION RAMP (theme-stable): canvas (page) -> default (raised panel) ->
 * subtle (recessed inset). The raised panel is always distinct from and forward
 * of the page in BOTH themes; elevation no longer inverts between light/dark.
 *
 * NOTE: `staticCss` is a Panda ROOT-config key and cannot be carried by a preset.
 * Recipe variants driven by runtime state (e.g. `interactiveItem({ selected })`)
 * emit NO CSS unless the consuming `panda.config` lists them in `staticCss`.
 * `panda.shared.ts` sets this for the internal build; consumers of this preset
 * must replicate `staticCss.recipes` for every recipe they render dynamically.
 */

export const designSystemPreset = definePreset({
  name: 'design-system',
  globalCss: colorSchemeGlobalCss,
  theme: {
    extend: {
      keyframes: motionKeyframes,
      tokens: {
        animations: animationTokens,
        fontSizes: microFontSizes,
        zIndex: zIndexTokens,
      },
      semanticTokens: {
        shadows: elevationShadows,
        colors: {
          // Each family below is defined in `src/tokens/sharedThemeTokens.ts`,
          // the one source this preset and the internal `panda.shared.ts`
          // config both read — the rationale for each ramp lives there. Order
          // is load-bearing only in that it is the order both configs use.
          surface: surfaceColors,
          text: textColors,
          border: borderColors,
          interactive: interactiveColors,
          scrollbar: scrollbarColors,
          overlay: overlayColors,
          fg: fgColors,
          bg: bgColors,
          // The chart/identity families come from their own shared module,
          // `src/tokens/chartColorTokens.ts` (the union
          // `@archon-research/charting` mirrors is derived from it).
          chart: chartColorSemanticTokens.chart,
          heat: heatColors,
          categorical: categoricalColors,
          identity: chartColorSemanticTokens.identity,
          // ── colorPalette ROLE tokens (role-based, on the 50-950 scale) ──
          ...colorPaletteRoleTokens,
        },
      },
      // NOT shared with `panda.shared.ts` via a module like
      // `sharedThemeTokens.ts`, but kept in sync by hand: both configs define
      // the same seven text styles below (`figure` included — the `meter` and
      // `keyValueTable` slot recipes reference it, so a config missing it
      // would silently drop just their tabular-numeral styling).
      textStyles: {
        sectionLabel: {
          value: {
            fontSize: 'xs',
            fontWeight: 'medium',
            letterSpacing: 'wide',
          },
        },
        // Micro type roles so consumers stop reaching for a raw `2xs`/`3xs`.
        microLabel: {
          value: {
            fontSize: '3xs',
            fontWeight: 'medium',
            letterSpacing: 'wide',
          },
        },
        metaText: {
          value: {
            fontSize: '2xs',
            lineHeight: 'relaxed',
          },
        },
        panelTitle: {
          value: {
            fontSize: 'xl',
            fontWeight: 'semibold',
            lineHeight: 'tight',
          },
        },
        bodySm: {
          value: {
            fontSize: 'sm',
            lineHeight: 'relaxed',
          },
        },
        // Numeric/figure type: mono family with tabular figures and slightly
        // tightened tracking so columns of numbers align and a headline figure
        // and the row beneath it read as the same kind of value. Consumers reach
        // for this (or the `Figure` atom / `figure` recipe) instead of
        // re-declaring `fontVariantNumeric: 'tabular-nums'` at each call site.
        figure: {
          value: {
            fontFamily: 'mono',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          },
        },
        codeBlock: {
          value: {
            fontFamily: 'mono',
            fontSize: 'sm',
            lineHeight: 'relaxed',
          },
        },
      },
      // Shared with `panda.shared.ts` via `./recipes/sharedRecipes.ts` — both
      // configs reference the same `designSystemRecipes` /
      // `designSystemSlotRecipes` maps, so the internal build and this
      // published preset structurally cannot register a different recipe set
      // again the way they used to (see that module's doc comment).
      recipes: designSystemRecipes,
      slotRecipes: designSystemSlotRecipes,
    },
  },
});
