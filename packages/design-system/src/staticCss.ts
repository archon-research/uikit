/**
 * Every recipe this package registers, mapped to `['*']` for Panda `staticCss`
 * coverage. `staticCss` is a Panda ROOT-config key, so a preset cannot carry it
 * — a consumer must set it in their own `panda.config.ts` or recipe variants
 * driven by runtime state emit no CSS (and it fails silently). Spread this map
 * so you never have to hand-list (or keep in sync) the recipe set:
 *
 * ```ts
 * // panda.config.ts
 * import { designSystemStaticCssRecipes } from '@archon-research/design-system';
 *
 * export default defineConfig({
 *   presets: [designSystemPreset],
 *   staticCss: {
 *     recipes: {
 *       ...designSystemStaticCssRecipes,
 *       // ...your own recipes here
 *     },
 *   },
 * });
 * ```
 *
 * This is the authoritative recipe list — the internal `panda.shared.ts`
 * consumes it too, so the two never drift.
 */
export const designSystemStaticCssRecipes = {
  button: ['*'],
  panelAction: ['*'],
  interactiveItem: ['*'],
  sectionHeading: ['*'],
  panelSection: ['*'],
  statRow: ['*'],
  code: ['*'],
  pageShell: ['*'],
  badge: ['*'],
  surfaceMessage: ['*'],
  segmentedControl: ['*'],
  toggleSwitch: ['*'],
  input: ['*'],
  drawer: ['*'],
  statTile: ['*'],
  sidebarGrid: ['*'],
  indicator: ['*'],
  select: ['*'],
  searchInput: ['*'],
  emptyState: ['*'],
  themeToggle: ['*'],
  sidebarLayout: ['*'],
  splitLayout: ['*'],
  panel: ['*'],
  dataTable: ['*'],
  chip: ['*'],
  facetedMultiSelect: ['*'],
  rangeSlider: ['*'],
  playbackBar: ['*'],
  heatCell: ['*'],
  figure: ['*'],
  meter: ['*'],
  proportionBar: ['*'],
  proportionList: ['*'],
  tooltip: ['*'],
  infoTip: ['*'],
  flash: ['*'],
  statusPill: ['*'],
  statusPillRow: ['*'],
  popover: ['*'],
  keyValueTable: ['*'],
} satisfies Record<string, ['*']>;
