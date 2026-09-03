import { describe, expect, it } from 'vitest';

import * as ark from './ark.js';
import * as dataTable from './components/data-table/index.js';
import * as drawer from './components/Drawer.js';
import * as infoPopover from './components/InfoPopover.js';
import * as popover from './components/Popover.js';
import * as rangeSlider from './components/RangeSlider.js';
import * as searchInput from './components/SearchInput.js';
import * as root from './index.js';
import * as sidebarLayout from './layouts/SidebarLayout.js';
import * as splitLayout from './layouts/SplitLayout.js';
import * as recipes from './recipes/index.js';

/**
 * Every module behind a `package.json` subpath export, keyed by the subpath a
 * consumer writes. A subpath is a second door onto code the root barrel already
 * exports — never a different or smaller API — so the invariant worth holding is
 * that each one is a subset of the root.
 */
const SUBPATH_MODULES: Record<string, object> = {
  './ark': ark,
  './data-table': dataTable,
  './drawer': drawer,
  './info-popover': infoPopover,
  './popover': popover,
  './range-slider': rangeSlider,
  './recipes': recipes,
  './search-input': searchInput,
  './sidebar-layout': sidebarLayout,
  './split-layout': splitLayout,
};

/**
 * Every value the root barrel exported before the Ark pass-throughs moved into
 * `ark.ts` and the component subpaths were added. The root barrel is public
 * API: it may grow, but nothing here may disappear from it without a major
 * version.
 */
const PUBLISHED_ROOT_EXPORTS = [
  'AsyncStateRenderer',
  'Avatar',
  'Badge',
  'Button',
  'Chip',
  'Code',
  'CodeBlock',
  'DEFAULT_RANGE_PRESET',
  'DataTable',
  'DateRangeFilter',
  'Dialog',
  'Drawer',
  'EMPTY_FILTER_STATE',
  'EmptyState',
  'ErrorBoundary',
  'ErrorState',
  'FILTER_FIELD_MERGE_MODE',
  'FacetedMultiSelect',
  'Field',
  'Figure',
  'FilterProvider',
  'FlashOnChange',
  'HeatCell',
  'IDENTITY_SLOT_COUNT',
  'Indicator',
  'InfoPopover',
  'InfoTip',
  'KeyValueTable',
  'LoadingIndicator',
  'Menu',
  'Meter',
  'PageShell',
  'Panel',
  'PlaybackBar',
  'Popover',
  'Portal',
  'Progress',
  'ProportionBar',
  'ProportionList',
  'RangePicker',
  'RangeSlider',
  'SKELETON_FILL_VAR',
  'SearchInput',
  'Select',
  'SidebarGrid',
  'SidebarLayout',
  'SkeletonRows',
  'SkeletonStack',
  'Slider',
  'Sparkline',
  'SplitLayout',
  'StatRow',
  'StatTile',
  'StatusPill',
  'StatusPillRow',
  'StyledSelect',
  'SurfaceMessage',
  'SurfaceMessageActions',
  'SurfaceMessageBody',
  'SurfaceMessageRoot',
  'SurfaceMessageTitle',
  'Switch',
  'THEME_BOOTSTRAP_SCRIPT',
  'THEME_LEGACY_STORAGE_KEY',
  'THEME_STORAGE_KEY',
  'TRANSPORT_HOTKEYS',
  'Tabs',
  'TextInput',
  'Textarea',
  'ThemeProvider',
  'ThemeToggle',
  'Toggle',
  'ToggleGroup',
  'Tooltip',
  'TreeRow',
  'TreeView',
  'applyThemeBootstrap',
  'badgeRecipe',
  'buildRowSearchString',
  'buttonRecipe',
  'chartColorCssVarName',
  'chartColorSemanticTokens',
  'chartColorTokenPaths',
  'chipRecipe',
  'codeRecipe',
  'createLiveSource',
  'createReplaySource',
  'createTreeCollection',
  'dataTableRecipe',
  'defaultTimeRange',
  'defineColumns',
  'defineIdentifiedColumns',
  'deserializeFilterState',
  'deserializeSorting',
  'designSystemComponentManifest',
  'designSystemStaticCssRecipes',
  'drawerRecipe',
  'emptyStateRecipe',
  'facetedMultiSelectRecipe',
  'figureRecipe',
  'flashDirection',
  'flashRecipe',
  'getFieldDateRange',
  'getFieldRange',
  'getFieldText',
  'getFieldValues',
  'heatCellRecipe',
  'identityPalette',
  'indicatorRecipe',
  'infoTipRecipe',
  'inputRecipe',
  'interactiveItemRecipe',
  'isFilterStateEmpty',
  'isRangePreset',
  'keyValueTableRecipe',
  'matchesSearchQuery',
  'meterPercent',
  'meterRecipe',
  'normalizeSearchString',
  'numericColumnMeta',
  'pageShellRecipe',
  'panelActionRecipe',
  'panelRecipe',
  'panelSectionRecipe',
  'playbackBarRecipe',
  'popoverRecipe',
  'presetToRange',
  'proportionBarRecipe',
  'proportionListRecipe',
  'rangeSliderRecipe',
  'resolveBootstrapTheme',
  'searchInputRecipe',
  'sectionHeadingRecipe',
  'segmentedControlRecipe',
  'selectRecipe',
  'serializeFilterState',
  'serializeSorting',
  'shouldWarnMissingGetRowId',
  'sidebarGridRecipe',
  'sidebarLayoutRecipe',
  'splitLayoutRecipe',
  'statRowRecipe',
  'statTileRecipe',
  'statusPillRecipe',
  'statusPillRowRecipe',
  'surfaceMessageRecipe',
  'switchRecipe',
  'themeToggleRecipe',
  'tooltipRecipe',
  'useDataTable',
  'useFilterDateRange',
  'useFilterRange',
  'useFilterState',
  'useFilterStore',
  'useFilterText',
  'useFilterValues',
  'useHashRoute',
  'useIdentityPalette',
  'useMediaQuery',
  'usePlayback',
  'usePrefersReducedMotion',
  'useSettled',
  'useTheme',
  'useTransportHotkeys',
  'useTreeView',
  'useUrlSyncedFilterStore',
  'useUrlSyncedTableStateAdapter',
  'useValueFlash',
  'validateSortingState',
];

describe('subpath exports', () => {
  it.each(Object.entries(SUBPATH_MODULES))(
    '%s exports only names the root barrel also exports',
    (_subpath, mod) => {
      const rootNames = new Set(Object.keys(root));
      const missingFromRoot = Object.keys(mod).filter(
        (name) => !rootNames.has(name),
      );
      expect(missingFromRoot).toEqual([]);
    },
  );

  it('re-exports every Ark pass-through from the root barrel', () => {
    // `ark.ts` is the root barrel's only source of these, so a name dropped
    // there silently disappears from the root too.
    expect(Object.keys(ark).length).toBeGreaterThan(0);
    expect(Object.keys(root)).toEqual(expect.arrayContaining(Object.keys(ark)));
  });

  it('never drops a name the root barrel already published', () => {
    expect(Object.keys(root)).toEqual(
      expect.arrayContaining(PUBLISHED_ROOT_EXPORTS),
    );
  });
});
