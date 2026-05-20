export type DesignSystemBehaviorSource =
  | 'design-system'
  | 'ark-ui'
  | 'base-ui'
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

export type DesignSystemLifecycleStatus =
  | 'stable'
  | 'migration'
  | 'deprecated';

export type DesignSystemComponentManifestEntry = {
  exportName: string;
  behaviorSource: DesignSystemBehaviorSource;
  styleOwner: DesignSystemStyleOwner;
  storyBucket: DesignSystemStoryBucket;
  contractScope: string | null;
  recipeKey: string | null;
  status: DesignSystemLifecycleStatus;
};

export const designSystemComponentManifest = [
  {
    exportName: 'Button',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: 'button',
    recipeKey: 'button',
    status: 'stable',
  },
  {
    exportName: 'LoadingIndicator',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'atoms',
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'ResizeHandle',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'atoms',
    contractScope: 'resize-handle',
    recipeKey: null,
    status: 'deprecated',
  },
  {
    exportName: 'Switch',
    behaviorSource: 'ark-ui',
    styleOwner: 'design-system-preset',
    storyBucket: 'atoms',
    contractScope: null,
    recipeKey: 'toggleSwitch',
    status: 'stable',
  },
  {
    exportName: 'SearchInput',
    behaviorSource: 'ark-ui',
    styleOwner: 'design-system',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: null,
    status: 'migration',
  },
  {
    exportName: 'Select',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'StyledSelect',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'SurfaceMessage',
    behaviorSource: 'design-system',
    styleOwner: 'design-system-preset',
    storyBucket: 'molecules',
    contractScope: 'surface-message',
    recipeKey: 'surfaceMessage',
    status: 'stable',
  },
  {
    exportName: 'ThemeToggle',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'SkeletonRows',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'SkeletonStack',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'molecules',
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'AsyncStateRenderer',
    behaviorSource: 'design-system',
    styleOwner: 'consumer',
    storyBucket: 'organisms',
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'DataTable',
    behaviorSource: 'tanstack-react-table',
    styleOwner: 'design-system',
    storyBucket: 'organisms',
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'EmptyState',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'organisms',
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'ErrorBoundary',
    behaviorSource: 'design-system',
    styleOwner: 'consumer',
    storyBucket: 'organisms',
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'ErrorState',
    behaviorSource: 'design-system',
    styleOwner: 'design-system',
    storyBucket: 'organisms',
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'SidebarLayout',
    behaviorSource: 'ark-ui',
    styleOwner: 'design-system',
    storyBucket: 'templates',
    contractScope: 'resize-handle',
    recipeKey: null,
    status: 'migration',
  },
  {
    exportName: 'Tabs',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'Toggle',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'ToggleGroup',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
  {
    exportName: 'Tooltip',
    behaviorSource: 'ark-ui',
    styleOwner: 'consumer',
    storyBucket: null,
    contractScope: null,
    recipeKey: null,
    status: 'stable',
  },
] as const satisfies readonly DesignSystemComponentManifestEntry[];
