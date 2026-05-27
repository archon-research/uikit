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
    exportName: 'SearchInput',
    behaviorSource: 'ark-ui',
    styleOwner: 'design-system',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'Select',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: null,
  },
  {
    exportName: 'StyledSelect',
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
    styleOwner: 'design-system',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: null,
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
    styleOwner: 'design-system',
    storyBucket: 'organisms',
    contractScope: null,
    recipeKey: null,
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
    styleOwner: 'design-system',
    storyBucket: 'templates',
    contractScope: 'resize-handle',
    recipeKey: null,
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
] as const satisfies readonly DesignSystemComponentManifestEntry[];
