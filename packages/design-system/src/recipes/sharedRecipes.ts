import { badgeRecipe } from './badge.recipe.js';
import { buttonRecipe } from './button.recipe.js';
import { chipRecipe } from './chip.recipe.js';
import { codeRecipe } from './code.recipe.js';
import { dataTableRecipe } from './dataTable.recipe.js';
import { drawerRecipe } from './drawer.recipe.js';
import { emptyStateRecipe } from './emptyState.recipe.js';
import { facetedMultiSelectRecipe } from './facetedMultiSelect.recipe.js';
import { figureRecipe } from './figure.recipe.js';
import { flashRecipe } from './flash.recipe.js';
import { heatCellRecipe } from './heatCell.recipe.js';
import { indicatorRecipe } from './indicator.recipe.js';
import { inputRecipe } from './input.recipe.js';
import { interactiveItemRecipe } from './interactiveItem.recipe.js';
import { keyValueTableRecipe } from './keyValueTable.recipe.js';
import {
  meterRecipe,
  proportionBarRecipe,
  proportionListRecipe,
} from './meter.recipe.js';
import { pageShellRecipe } from './pageShell.recipe.js';
import { panelRecipe } from './panel.recipe.js';
import { panelActionRecipe } from './panelAction.recipe.js';
import { panelSectionRecipe } from './panelSection.recipe.js';
import { playbackBarRecipe } from './playbackBar.recipe.js';
import { popoverRecipe } from './popover.recipe.js';
import { rangeSliderRecipe } from './rangeSlider.recipe.js';
import { searchInputRecipe } from './searchInput.recipe.js';
import { sectionHeadingRecipe } from './sectionHeading.recipe.js';
import { segmentedControlRecipe } from './segmentedControl.recipe.js';
import { selectRecipe } from './select.recipe.js';
import { sidebarGridRecipe } from './sidebarGrid.recipe.js';
import { sidebarLayoutRecipe } from './sidebarLayout.recipe.js';
import { splitLayoutRecipe } from './splitLayout.recipe.js';
import { statRowRecipe, statTileRecipe } from './statTile.recipe.js';
import { statusPillRecipe, statusPillRowRecipe } from './statusPill.recipe.js';
import { surfaceMessageRecipe } from './surfaceMessage.recipe.js';
import { switchRecipe } from './switch.recipe.js';
import { themeToggleRecipe } from './themeToggle.recipe.js';
import { infoTipRecipe, tooltipRecipe } from './tooltip.recipe.js';

/**
 * THE authoritative `recipes` and `slotRecipes` maps that BOTH Panda configs
 * in this package need: the published preset (`../panda-preset.ts`) and the
 * internal config this repo's own preview actually builds with
 * (`../../panda.shared.ts`).
 *
 * Why this module exists: those two files used to hand-list this pairing
 * twice, and the lists silently drifted — `panda.shared.ts` registered only
 * 9 of these 13 `recipes` and 21 of these 28 `slotRecipes`, so `figure`,
 * `tooltip`, `flash`, `statusPillRow`, `meter`, `proportionBar`,
 * `proportionList`, `infoTip`, `statusPill`, `popover` and `keyValueTable`
 * emitted NO CSS in this repo's own preview even though
 * `../staticCss.ts#designSystemStaticCssRecipes` listed all 41 — those
 * components rendered completely unstyled there. Both configs now reference
 * these two objects at the position the hand-listed maps used to occupy, so
 * the emitted recipe set cannot diverge between them again — the same fix
 * `../tokens/sharedThemeTokens.ts` applied to the theme tokens.
 */
export const designSystemRecipes = {
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
};

export const designSystemSlotRecipes = {
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
};
