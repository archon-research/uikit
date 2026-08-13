/**
 * The canonical inventory of every component this package exports — the single
 * source of truth for "what's available and where its behaviour comes from".
 * It is exported at runtime (`designSystemComponentManifest`) so tooling,
 * consumers, and agents can read it directly; the README points here rather
 * than duplicating it into a separate doc.
 *
 * When you add or remove a public component export in `index.ts`, update this
 * array too — a test (`component-manifest.test.ts`) fails if a component export
 * is missing here.
 *
 * Fields:
 * - `exportName`   — the exported symbol from `@archon-research/design-system`.
 * - `behaviorSource` — where the behaviour lives: `design-system` (owned here),
 *   `ark-ui` (wraps/re-exports an Ark UI primitive), or `tanstack-react-table`.
 * - `styleOwner`   — who owns the visuals: `design-system-preset` (a Panda recipe
 *   you can override via `className`), `design-system` (component-local styling),
 *   or `consumer` (unstyled re-export — you style it).
 * - `storyBucket`  — Ladle catalogue bucket, or null.
 * - `contractScope`/`recipeKey` — the recipe/contract backing it, if any.
 */
export type DesignSystemBehaviorSource =
  | 'design-system'
  | 'ark-ui'
  | 'tanstack-react-table';

export type DesignSystemStyleOwner =
  | 'design-system'
  | 'design-system-preset'
  | 'consumer';

export type DesignSystemStoryBucket =
  | 'atoms'
  | 'molecules'
  | 'organisms'
  | 'templates'
  | null;

export type DesignSystemComponentManifestEntry = {
  exportName: string;
  behaviorSource: DesignSystemBehaviorSource;
  styleOwner: DesignSystemStyleOwner;
  storyBucket: DesignSystemStoryBucket;
  contractScope: string | null;
  recipeKey: string | null;
};

/**
 * The colorPalettes that carry full role sub-tokens
 * (solid/subtle/surface/outline/plain, each with bg/fg/border). Constrain a
 * component's `colorPalette` prop to this so consumers can't select a hue the
 * preset doesn't fully theme. `gray` is an alias of `neutral`, kept for
 * back-compat.
 */
export type ColorPalette =
  | 'neutral'
  | 'gray'
  | 'green'
  | 'red'
  | 'amber'
  | 'blue';

export const designSystemComponentManifest = [
  {
    exportName: 'Button',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: 'button',
    recipeKey: 'button',
  },
  {
    exportName: 'TreeRow',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'atoms',
    contractScope: 'tree-row',
    recipeKey: null,
  },
  {
    exportName: 'LoadingIndicator',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'atoms',
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'Switch',
    behaviorSource: 'ark-ui',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: null,
    recipeKey: 'toggleSwitch',
  },
  {
    exportName: 'Badge',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: 'badge',
    recipeKey: 'badge',
  },
  {
    exportName: 'Indicator',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: 'indicator',
    recipeKey: 'indicator',
  },
  {
    exportName: 'SearchInput',
    behaviorSource: 'ark-ui',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: 'searchInput',
  },
  {
    exportName: 'Select',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: 'select',
  },
  {
    exportName: 'StyledSelect',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: 'select',
  },
  {
    exportName: 'RangePicker',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'SurfaceMessage',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: 'surface-message',
    recipeKey: 'surfaceMessage',
  },
  {
    exportName: 'ThemeToggle',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: 'themeToggle',
  },
  {
    exportName: 'SkeletonRows',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'SkeletonStack',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'AsyncStateRenderer',
    behaviorSource: 'design-system',
    styleOwner: 'consumer',
    storyBucket: 'organisms',
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'DataTable',
    behaviorSource: 'tanstack-react-table',
    styleOwner: 'design-system-preset',
    storyBucket: 'organisms',
    contractScope: null,
    recipeKey: 'dataTable',
  },
  {
    exportName: 'EmptyState',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'organisms',
    contractScope: null,
    recipeKey: 'emptyState',
  },
  {
    exportName: 'ErrorBoundary',
    behaviorSource: 'design-system',
    styleOwner: 'consumer',
    storyBucket: 'organisms',
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'ErrorState',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'organisms',
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'SidebarLayout',
    behaviorSource: 'ark-ui',
    styleOwner: 'design-system-preset',
    storyBucket: 'templates',
    contractScope: 'resize-handle',
    recipeKey: 'sidebarLayout',
  },
  {
    exportName: 'SplitLayout',
    behaviorSource: 'ark-ui',
    styleOwner: 'design-system-preset',
    storyBucket: 'templates',
    contractScope: 'resize-handle',
    recipeKey: 'splitLayout',
  },
  {
    exportName: 'Tabs',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'Toggle',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'ToggleGroup',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'Tooltip',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'Dialog',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'Portal',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'Avatar',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'Menu',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'Slider',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'TreeView',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'TextInput',
    behaviorSource: 'ark-ui',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: 'input',
    recipeKey: 'input',
  },
  {
    exportName: 'Textarea',
    behaviorSource: 'ark-ui',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: 'input',
    recipeKey: 'input',
  },
  {
    exportName: 'Drawer',
    behaviorSource: 'ark-ui',
    styleOwner: 'design-system-preset',
    storyBucket: 'organisms',
    contractScope: 'drawer',
    recipeKey: 'drawer',
  },
  {
    exportName: 'Field',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'Progress',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'Sparkline',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'atoms',
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'Panel',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: 'panel',
    recipeKey: 'panel',
  },
  {
    exportName: 'StatTile',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: 'stat-tile',
    recipeKey: 'statTile',
  },
  {
    exportName: 'StatRow',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: 'stat-row',
    recipeKey: 'statRow',
  },
  {
    exportName: 'Code',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: 'code',
    recipeKey: 'code',
  },
  {
    exportName: 'CodeBlock',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: 'code',
    recipeKey: 'code',
  },
  {
    exportName: 'PageShell',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'templates',
    contractScope: 'page-shell',
    recipeKey: 'pageShell',
  },
  {
    exportName: 'SidebarGrid',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'templates',
    contractScope: 'sidebar-grid',
    recipeKey: 'sidebarGrid',
  },
  {
    exportName: 'Chip',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: 'chip',
    recipeKey: 'chip',
  },
  {
    exportName: 'HeatCell',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: 'heat-cell',
    recipeKey: 'heatCell',
  },
  {
    exportName: 'FacetedMultiSelect',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: 'faceted-multi-select',
    recipeKey: 'facetedMultiSelect',
  },
  {
    exportName: 'RangeSlider',
    behaviorSource: 'ark-ui',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: 'rangeSlider',
  },
  {
    exportName: 'DateRangeFilter',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'FilterProvider',
    behaviorSource: 'design-system',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'PlaybackBar',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'organisms',
    contractScope: 'playback-bar',
    recipeKey: 'playbackBar',
  },
  {
    exportName: 'Figure',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: 'figure',
    recipeKey: 'figure',
  },
  {
    exportName: 'Meter',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: 'meter',
    recipeKey: 'meter',
  },
  {
    exportName: 'ProportionBar',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: 'proportion-bar',
    recipeKey: 'proportionBar',
  },
  {
    exportName: 'InfoTip',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: 'info-tip',
    recipeKey: 'infoTip',
  },
  {
    exportName: 'FlashOnChange',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: null,
    recipeKey: 'flash',
  },
  {
    exportName: 'ProportionList',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: 'proportion-list',
    recipeKey: 'proportionList',
  },
  {
    exportName: 'StatusPill',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: 'status-pill',
    recipeKey: 'statusPill',
  },
  {
    exportName: 'StatusPillRow',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: 'status-pill-row',
    recipeKey: 'statusPillRow',
  },
] as const satisfies readonly DesignSystemComponentManifestEntry[];
