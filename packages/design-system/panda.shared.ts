import type { Config } from '@pandacss/dev';

import { designSystemStaticCssRecipes } from './src/staticCss';

import { badgeRecipe } from './src/recipes/badge.recipe';
import { buttonRecipe } from './src/recipes/button.recipe';
import { chipRecipe } from './src/recipes/chip.recipe';
import { codeRecipe } from './src/recipes/code.recipe';
import { drawerRecipe } from './src/recipes/drawer.recipe';
import { emptyStateRecipe } from './src/recipes/emptyState.recipe';
import { facetedMultiSelectRecipe } from './src/recipes/facetedMultiSelect.recipe';
import { heatCellRecipe } from './src/recipes/heatCell.recipe';
import { indicatorRecipe } from './src/recipes/indicator.recipe';
import { inputRecipe } from './src/recipes/input.recipe';
import { interactiveItemRecipe } from './src/recipes/interactiveItem.recipe';
import { pageShellRecipe } from './src/recipes/pageShell.recipe';
import { panelActionRecipe } from './src/recipes/panelAction.recipe';
import { panelSectionRecipe } from './src/recipes/panelSection.recipe';
import { rangeSliderRecipe } from './src/recipes/rangeSlider.recipe';
import { searchInputRecipe } from './src/recipes/searchInput.recipe';
import { sectionHeadingRecipe } from './src/recipes/sectionHeading.recipe';
import { segmentedControlRecipe } from './src/recipes/segmentedControl.recipe';
import { selectRecipe } from './src/recipes/select.recipe';
import { sidebarGridRecipe } from './src/recipes/sidebarGrid.recipe';
import { dataTableRecipe } from './src/recipes/dataTable.recipe';
import { panelRecipe } from './src/recipes/panel.recipe';
import { playbackBarRecipe } from './src/recipes/playbackBar.recipe';
import { sidebarLayoutRecipe } from './src/recipes/sidebarLayout.recipe';
import { splitLayoutRecipe } from './src/recipes/splitLayout.recipe';
import { statRowRecipe, statTileRecipe } from './src/recipes/statTile.recipe';
import { surfaceMessageRecipe } from './src/recipes/surfaceMessage.recipe';
import { switchRecipe } from './src/recipes/switch.recipe';
import { themeToggleRecipe } from './src/recipes/themeToggle.recipe';
import { chartColorSemanticTokens } from './src/tokens/chartColorTokens';
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
 * What is still stated inline and is NOT shared: `textStyles`, `recipes` and
 * `slotRecipes`, because they genuinely DIFFER from the preset's rather than
 * duplicating them. See the comments at those keys.
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
        fontSizes: microFontSizes,
        zIndex: zIndexTokens,
      },
      // NOT shared with the preset, unlike the tokens above: this list is
      // MISSING the preset's `figure` entry (the other six are identical). That
      // is real DRIFT, not duplication — folding the two together would add CSS
      // here — so it stays inline until the drift is fixed deliberately.
      // (It previously defined NO textStyles at all, so every recipe
      // `textStyle: '…'` reference silently emitted nothing.)
      textStyles: {
        sectionLabel: {
          value: { fontSize: 'xs', fontWeight: 'medium', letterSpacing: 'wide' },
        },
        panelTitle: {
          value: { fontSize: 'xl', fontWeight: 'semibold', lineHeight: 'tight' },
        },
        bodySm: {
          value: { fontSize: 'sm', lineHeight: 'relaxed' },
        },
        codeBlock: {
          value: { fontFamily: 'mono', fontSize: 'sm', lineHeight: 'relaxed' },
        },
        microLabel: {
          value: { fontSize: '3xs', fontWeight: 'medium', letterSpacing: 'wide' },
        },
        metaText: {
          value: { fontSize: '2xs', lineHeight: 'relaxed' },
        },
      },
      // Also NOT shared, same reason: this config registers only 9 of the
      // preset's 13 recipes and 21 of its 28 slot recipes. The 11 it omits
      // (`figure`, `tooltip`, `flash`, `statusPillRow`, `meter`,
      // `proportionBar`, `proportionList`, `infoTip`, `statusPill`, `popover`,
      // `keyValueTable`) therefore emit NO CSS in this build even though
      // `designSystemStaticCssRecipes` above lists all 41 — those components
      // render unstyled in the preview. Fixing it changes rendered output and
      // snapshot baselines, so it is deliberately left alone here.
      recipes: {
        button: buttonRecipe,
        panelAction: panelActionRecipe,
        interactiveItem: interactiveItemRecipe,
        sectionHeading: sectionHeadingRecipe,
        panelSection: panelSectionRecipe,
        statRow: statRowRecipe,
        code: codeRecipe,
        pageShell: pageShellRecipe,
        badge: badgeRecipe,
      },
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
      slotRecipes: {
        segmentedControl: segmentedControlRecipe,
        surfaceMessage: surfaceMessageRecipe,
        toggleSwitch: switchRecipe,
        input: inputRecipe,
        drawer: drawerRecipe,
        statTile: statTileRecipe,
        sidebarGrid: sidebarGridRecipe,
        indicator: indicatorRecipe,
        select: selectRecipe,
        searchInput: searchInputRecipe,
        emptyState: emptyStateRecipe,
        themeToggle: themeToggleRecipe,
        sidebarLayout: sidebarLayoutRecipe,
        splitLayout: splitLayoutRecipe,
        panel: panelRecipe,
        dataTable: dataTableRecipe,
        chip: chipRecipe,
        facetedMultiSelect: facetedMultiSelectRecipe,
        rangeSlider: rangeSliderRecipe,
        playbackBar: playbackBarRecipe,
        heatCell: heatCellRecipe,
      },
    },
  },
} satisfies Partial<Config>;
