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
    styleOwner: 'design-system',
    storyBucket: 'organisms',
    contractScope: null,
    recipeKey: null,
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
    recipeKey: 'panelSection',
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
] as const satisfies readonly DesignSystemComponentManifestEntry[];
