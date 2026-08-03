// The declarative-dashboard schema — the data contract a manifest conforms to.
export type {
  DashboardSpec,
  DashboardDataSources,
  DataBinding,
  LayoutDirection,
  LayoutNode,
  SplitLayoutNode,
  ThresholdRule,
  ThresholdSeverity,
  WidgetInteraction,
  WidgetLayoutNode,
  WidgetNode,
  WidgetTableColumn,
} from './schema.js';

// The recursive renderer.
export {
  DashboardRenderer,
  renderLayoutNode,
  type DashboardRendererProps,
} from './renderer.js';

// The string -> component registry mechanism + the default generic adapters.
export {
  DEFAULT_REGISTRY,
  UnknownWidget,
  mergeRegistries,
  type ComponentRegistry,
  type RegistryComponent,
  type RegistryComponentProps,
} from './registry.js';

// Structural + referential manifest validation, and the agent-exposure query.
export {
  collectAgentWritableKeys,
  dashboardSpecSchema,
  validateDashboardSpec,
  type ManifestIssue,
  type ManifestValidation,
  type ValidateOptions,
} from './validate.js';

// The generic interaction surface: the local store + the per-key read hook.
export {
  useInteractionField,
  useLocalInteraction,
  type InteractionContextValue,
} from './interaction.js';

// The adapter onto charting's real per-key interaction store.
export {
  DEFAULT_INTERACTION_KEY_MAP,
  useChartingInteraction,
  type ChartingInteraction,
  type InteractionKeyMap,
} from './charting-interaction.js';
