import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
 * Every subpath export that is a second door onto code the root barrel already
 * exports — never a different or smaller API — so the invariant worth holding
 * is that each one is a subset of the root. Keyed by the subpath a consumer
 * writes, and checked against `package.json` below, so this list cannot drift
 * from what is actually published.
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
 * The root barrel's complete published surface, asserted in BOTH directions:
 * nothing here may disappear without a major version, and nothing may appear
 * at the root without being written down here first.
 *
 * The second direction is the one that needs a reason. The package's surface is
 * an offering, kept small on purpose — so a name arriving by accident (an
 * `export *` widened one module, a helper made public to unblock one call site)
 * is a regression even though nobody loses anything by it. Making the census
 * exact turns every addition into a line in this list, which is a decision
 * somebody has to make on purpose and a reviewer can see.
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
      // A subset check is satisfied vacuously by a module that exports
      // nothing, so a subpath whose module went empty — the component moved
      // out, an `export` keyword dropped — would keep reading as a passing
      // "subset of the root" while the published subpath resolves to nothing.
      // The charting package never needs this: its three barrels partition
      // that package and their union is asserted equal to its root, so an
      // emptied barrel fails that equality. These subpaths are deliberate
      // subsets of a much larger root instead, so there is no union to compare
      // against and the non-emptiness has to be asserted on its own.
      expect(Object.keys(mod).length).toBeGreaterThan(0);

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

  it('publishes exactly the documented root surface, no more and no less', () => {
    expect(Object.keys(root).sort()).toEqual(
      [...PUBLISHED_ROOT_EXPORTS].sort(),
    );
  });
});

/**
 * Subpaths that deliberately publish something the root barrel does not, so
 * they are exempt from the subset invariant above but not from the
 * "`package.json` and this file agree" one below.
 */
const STANDALONE_SUBPATHS: Record<string, string> = {
  // Build-time Panda config, not runtime code: it must stay off the root
  // barrel so importing a component never drags the preset into an app bundle.
  './panda-preset': './dist/panda-preset.js',
  // Emitted by `scripts/emit-theme-bootstrap.ts` from the built module rather
  // than compiled from a source file of its own, for consumers under a
  // `script-src 'self'` CSP that cannot inline `THEME_BOOTSTRAP_SCRIPT`.
  './theme-bootstrap.js': './dist/theme-bootstrap.js',
};

const SRC_DIR = dirname(fileURLToPath(import.meta.url));

const packageJson = JSON.parse(
  readFileSync(resolve(SRC_DIR, '..', 'package.json'), 'utf8'),
) as {
  exports: Record<string, string | { types: string; default: string }>;
  sideEffects: string[];
};

/** `./dist/a/b.js` — a build output — mapped back to the module it compiles from. */
function sourceModuleFor(distPath: string): string | undefined {
  const stem = distPath.replace(/^\.\/dist\//, '').replace(/\.js$/, '');
  return ['.ts', '.tsx']
    .map((extension) => resolve(SRC_DIR, stem + extension))
    .find((candidate) => existsSync(candidate));
}

/**
 * `package.json` is the only part of the export surface a consumer's install
 * actually resolves through, and nothing else in this repo type-checks it: a
 * subpath added to the manifest but never imported here, or a target path
 * mistyped, fails first in a consumer's node_modules. These close that gap.
 */
describe('package.json exports', () => {
  it('declares exactly the subpaths this file accounts for', () => {
    expect(Object.keys(packageJson.exports).sort()).toEqual(
      [
        '.',
        ...Object.keys(SUBPATH_MODULES),
        ...Object.keys(STANDALONE_SUBPATHS),
      ].sort(),
    );
  });

  it.each(Object.entries(packageJson.exports))(
    '%s resolves to a module that exists',
    (subpath, target) => {
      if (typeof target === 'string') {
        // Only the generated bootstrap script is a bare target, and it has no
        // source module to resolve — the emit script writes it straight to
        // `dist`, which is also why it is the package's lone `sideEffects` entry.
        expect(target).toBe(STANDALONE_SUBPATHS[subpath]);
        expect(packageJson.sideEffects).toContain(target);
        return;
      }
      // A `types` path that has drifted from `default` is invisible to every
      // other check here: the runtime import keeps working and only the
      // consumer's editor goes quiet.
      expect(target.types).toBe(target.default.replace(/\.js$/, '.d.ts'));
      expect(sourceModuleFor(target.default)).toBeDefined();
    },
  );
});
