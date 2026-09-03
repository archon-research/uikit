import type { Config } from '@pandacss/dev';

import {
  designSystemRecipes,
  designSystemSlotRecipes,
} from './src/recipes/sharedRecipes';
import { designSystemStaticCssRecipes } from './src/staticCss';
import { chartColorSemanticTokens } from './src/tokens/chartColorTokens';
import {
  animationTokens,
  bgColors,
  borderColors,
  borderWidthTokens,
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
} from './src/tokens/sharedThemeTokens';

/**
 * Internal (unpublished) Panda config — the one this repo's own preview
 * (`packages/uikit-preview/panda.config.ts`) actually runs.
 *
 * Every semantic token family, colorPalette role, keyframe, animation and
 * shadow below is now a reference into `src/tokens/sharedThemeTokens.ts`, the
 * single source it shares with the published `src/panda-preset.ts`. It used to
 * restate all of them inline, and the two copies drifted — that is how
 * `identity.*` came to exist in the preset but not here, silently emitting no
 * CSS for every `var(--colors-identity-N)` the preview read.
 *
 * What still lives ONLY here: `staticCss` (a Panda ROOT-config key a preset
 * cannot carry — see the note below) and the other root-only keys
 * (`jsxFramework`, `outExtension`, `preflight`, `studio`).
 *
 * `recipes` and `slotRecipes` are now also shared, via
 * `src/recipes/sharedRecipes.ts` — the same `designSystemRecipes` /
 * `designSystemSlotRecipes` maps the preset registers. That module's doc
 * comment explains the drift this closed: this config used to hand-list only
 * a subset of the preset's recipes, so several components (`figure`,
 * `tooltip`, `meter`, `popover`, etc.) rendered unstyled in this repo's own
 * preview despite `designSystemStaticCssRecipes` below listing all of them.
 *
 * What is still stated inline and is NOT extracted into a shared module:
 * `textStyles`. It is hand-kept identical to the preset's copy rather than
 * factored out — see the comment at that key.
 */

export const designSystemPandaConfig = {
  jsxFramework: 'react',
  outExtension: 'js',
  preflight: true,
  // `staticCss` is a Panda ROOT-config key — a preset cannot carry it. Recipe
  // variants driven by RUNTIME state (e.g. `interactiveItem({ selected })`) emit
  // NO CSS unless the recipe is listed here, and the omission fails SILENTLY
  // (selection rendered nothing). The recipe list is the shared, exported
  // `designSystemStaticCssRecipes` map, so this config and the map consumers
  // spread into their own `panda.config` never drift.
  staticCss: {
    recipes: designSystemStaticCssRecipes,
  },
  globalCss: colorSchemeGlobalCss,
  studio: {
    logo: 'UI',
  },
  theme: {
    extend: {
      keyframes: motionKeyframes,
      tokens: {
        animations: animationTokens,
        borderWidths: borderWidthTokens,
        fontSizes: microFontSizes,
        zIndex: zIndexTokens,
      },
      // NOT extracted into a shared module with the preset, unlike the tokens
      // above, but hand-kept identical to its copy (`figure` included — the
      // `meter` and `keyValueTable` slot recipes reference it, so a config
      // missing it would silently drop just their tabular-numeral styling).
      // (It previously defined NO textStyles at all, so every recipe
      // `textStyle: '…'` reference silently emitted nothing.)
      textStyles: {
        sectionLabel: {
          value: {
            fontSize: 'xs',
            fontWeight: 'medium',
            letterSpacing: 'wide',
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
          value: { fontSize: 'sm', lineHeight: 'relaxed' },
        },
        codeBlock: {
          value: { fontFamily: 'mono', fontSize: 'sm', lineHeight: 'relaxed' },
        },
        microLabel: {
          value: {
            fontSize: '3xs',
            fontWeight: 'medium',
            letterSpacing: 'wide',
          },
        },
        metaText: {
          value: { fontSize: '2xs', lineHeight: 'relaxed' },
        },
        figure: {
          value: {
            fontFamily: 'mono',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          },
        },
      },
      // Shared with the preset via `src/recipes/sharedRecipes.ts` — both
      // configs reference the same `designSystemRecipes` /
      // `designSystemSlotRecipes` maps, so this build and the published preset
      // structurally cannot register a different recipe set again. This used
      // to hand-list only 9 of the preset's 13 recipes and 21 of its 28 slot
      // recipes; the 11 it omitted (`figure`, `tooltip`, `flash`,
      // `statusPillRow`, `meter`, `proportionBar`, `proportionList`,
      // `infoTip`, `statusPill`, `popover`, `keyValueTable`) emitted NO CSS in
      // this build even though `designSystemStaticCssRecipes` above lists all
      // 41 — those components rendered unstyled in the preview.
      recipes: designSystemRecipes,
      semanticTokens: {
        shadows: elevationShadows,
        colors: {
          // Each family is defined in `src/tokens/sharedThemeTokens.ts` — the
          // one source this config and the published `src/panda-preset.ts`
          // both read. The rationale for every ramp lives there.
          surface: surfaceColors,
          text: textColors,
          border: borderColors,
          interactive: interactiveColors,
          scrollbar: scrollbarColors,
          overlay: overlayColors,
          fg: fgColors,
          bg: bgColors,
          // The chart/identity families have their own shared module,
          // `src/tokens/chartColorTokens.ts`.
          chart: chartColorSemanticTokens.chart,
          heat: heatColors,
          categorical: categoricalColors,
          identity: chartColorSemanticTokens.identity,
          // ── colorPalette ROLE tokens (role-based, on the 50-950 scale) ──
          ...colorPaletteRoleTokens,
        },
      },
      slotRecipes: designSystemSlotRecipes,
    },
  },
} satisfies Partial<Config>;
