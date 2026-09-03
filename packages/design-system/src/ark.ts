/**
 * `@archon-research/design-system/ark` — the Ark UI components this package
 * passes through unstyled, in one place.
 *
 * These are re-exported rather than left to consumers because the
 * `design-system-boundaries` oxlint preset forbids importing `@ark-ui/react`
 * directly, which is also why they need a subpath of their own: bundled
 * together they are ~250 kB minified / ~74 kB gzipped (from ~1.7 kB for
 * `Portal` to ~99 kB for `Menu`), and reaching them only through the root
 * barrel gives a consumer nowhere to put a chunk boundary.
 *
 * Everything here is also re-exported from the root barrel.
 */
export { Avatar } from '@ark-ui/react/avatar';
export { Dialog } from '@ark-ui/react/dialog';
export { Field } from '@ark-ui/react/field';
export { Menu } from '@ark-ui/react/menu';
export { Portal } from '@ark-ui/react/portal';
export { Progress } from '@ark-ui/react/progress';
export { Slider } from '@ark-ui/react/slider';
export { Switch } from '@ark-ui/react/switch';
export { Tabs } from '@ark-ui/react/tabs';
export { Toggle } from '@ark-ui/react/toggle';
export { ToggleGroup } from '@ark-ui/react/toggle-group';
export { Tooltip } from '@ark-ui/react/tooltip';
export { TreeView, createTreeCollection } from '@ark-ui/react/tree-view';
export type { TreeCollection, TreeNode } from '@ark-ui/react/tree-view';
export {
  useTreeView,
  type UseTreeViewProps,
  type UseTreeViewReturn,
} from '@ark-ui/react/tree-view';
