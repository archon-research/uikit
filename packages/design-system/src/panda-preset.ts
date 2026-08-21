import { definePreset } from '@pandacss/dev';

import { badgeRecipe } from './recipes/badge.recipe.js';
import { buttonRecipe } from './recipes/button.recipe.js';
import { chipRecipe } from './recipes/chip.recipe.js';
import { codeRecipe } from './recipes/code.recipe.js';
import { dataTableRecipe } from './recipes/dataTable.recipe.js';
import { drawerRecipe } from './recipes/drawer.recipe.js';
import { emptyStateRecipe } from './recipes/emptyState.recipe.js';
import { facetedMultiSelectRecipe } from './recipes/facetedMultiSelect.recipe.js';
import { figureRecipe } from './recipes/figure.recipe.js';
import { flashRecipe } from './recipes/flash.recipe.js';
import { heatCellRecipe } from './recipes/heatCell.recipe.js';
import { indicatorRecipe } from './recipes/indicator.recipe.js';
import { inputRecipe } from './recipes/input.recipe.js';
import { interactiveItemRecipe } from './recipes/interactiveItem.recipe.js';
import { keyValueTableRecipe } from './recipes/keyValueTable.recipe.js';
import {
  meterRecipe,
  proportionBarRecipe,
  proportionListRecipe,
} from './recipes/meter.recipe.js';
import { pageShellRecipe } from './recipes/pageShell.recipe.js';
import { panelRecipe } from './recipes/panel.recipe.js';
import { panelActionRecipe } from './recipes/panelAction.recipe.js';
import { panelSectionRecipe } from './recipes/panelSection.recipe.js';
import { playbackBarRecipe } from './recipes/playbackBar.recipe.js';
import { popoverRecipe } from './recipes/popover.recipe.js';
import { rangeSliderRecipe } from './recipes/rangeSlider.recipe.js';
import { searchInputRecipe } from './recipes/searchInput.recipe.js';
import { sectionHeadingRecipe } from './recipes/sectionHeading.recipe.js';
import { segmentedControlRecipe } from './recipes/segmentedControl.recipe.js';
import { selectRecipe } from './recipes/select.recipe.js';
import { sidebarGridRecipe } from './recipes/sidebarGrid.recipe.js';
import { sidebarLayoutRecipe } from './recipes/sidebarLayout.recipe.js';
import { splitLayoutRecipe } from './recipes/splitLayout.recipe.js';
import { statRowRecipe, statTileRecipe } from './recipes/statTile.recipe.js';
import {
  statusPillRecipe,
  statusPillRowRecipe,
} from './recipes/statusPill.recipe.js';
import { surfaceMessageRecipe } from './recipes/surfaceMessage.recipe.js';
import { switchRecipe } from './recipes/switch.recipe.js';
import { themeToggleRecipe } from './recipes/themeToggle.recipe.js';
import { infoTipRecipe, tooltipRecipe } from './recipes/tooltip.recipe.js';
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
      // NOT shared with `panda.shared.ts`, unlike everything above: that config
      // is missing `figure` (its other six entries are identical). That is real
      // DRIFT, not duplication — unifying it would add CSS to the internal
      // build — so the two lists stay separate until the drift is fixed
      // deliberately.
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
      // Also NOT shared, and for the same reason: `panda.shared.ts` registers
      // only 9 of these 13 recipes and 21 of the 28 slot recipes below. The 11
      // it omits (`figure`, `tooltip`, `flash`, `statusPillRow`, `meter`,
      // `proportionBar`, `proportionList`, `infoTip`, `statusPill`, `popover`,
      // `keyValueTable`) emit no CSS in the internal build even though
      // `designSystemStaticCssRecipes` lists all 41 — so those components
      // currently render unstyled in this repo's own preview. Fixing that
      // changes rendered output and snapshots, so it is left as-is here rather
      // than folded into a no-op refactor.
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
        figure: figureRecipe,
        tooltip: tooltipRecipe,
        flash: flashRecipe,
        statusPillRow: statusPillRowRecipe,
      },
      slotRecipes: {
        surfaceMessage: surfaceMessageRecipe,
        segmentedControl: segmentedControlRecipe,
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
        meter: meterRecipe,
        proportionBar: proportionBarRecipe,
        proportionList: proportionListRecipe,
        infoTip: infoTipRecipe,
        statusPill: statusPillRecipe,
        popover: popoverRecipe,
        keyValueTable: keyValueTableRecipe,
      },
    },
  },
});
