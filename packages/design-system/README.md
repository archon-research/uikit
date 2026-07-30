# @archon-research/design-system

Shared UI components and design tokens built with React and Panda CSS.

## Installation

```bash
npm install @archon-research/design-system react react-dom
```

## Features

- Pre-built React components
- Design system tokens and recipes
- Theme customization via Panda CSS
- TypeScript support
- Component stories and documentation

## Usage

### Import components

```typescript
import { Panel, Button, Badge } from '@archon-research/design-system';

export function Example() {
  return (
    <Panel title="Status" meta="updated 2m ago">
      <Badge variant="solid" colorPalette="green">Healthy</Badge>
      <Button onClick={() => console.log('clicked')}>Refresh</Button>
    </Panel>
  );
}
```

### What's available

The full inventory is the **component manifest** — [`src/component-manifest.ts`](./src/component-manifest.ts),
also exported at runtime as `designSystemComponentManifest`. Each entry's
`behaviorSource` tells you whether an export is owned here or a wrapper/re-export
around [Ark UI](https://ark-ui.com) (Dialog, Tabs, Menu, TreeView, Slider, …) or
[TanStack Table](https://tanstack.com/table) (`DataTable`), and `styleOwner` tells
you who owns its visuals. Because it is data, you can also list it programmatically:

```typescript
import { designSystemComponentManifest } from '@archon-research/design-system';

const arkWrappers = designSystemComponentManifest.filter(
  (c) => c.behaviorSource === 'ark-ui',
);
```

Charts live in the separate [`@archon-research/charting`](../charting/README.md) package.

### Code-splitting heavy components

`DataTable` (pulls TanStack Table) and `Drawer` (pulls `@zag-js/drawer`) have their own
subpath entry points, so you can lazy-load them out of your initial bundle:

```typescript
import { lazy } from 'react';

const DataTable = lazy(() =>
  import('@archon-research/design-system/data-table').then((m) => ({ default: m.DataTable })),
);
// likewise: import('@archon-research/design-system/drawer')
```

The package is marked `sideEffects: false`, so importing only what you use is fully
tree-shakeable (a `Badge`-only import ships ~1 KB, not the Ark/TanStack engine).

### Use design tokens

```typescript
import { defineConfig } from '@pandacss/dev';
import designSystemPreset from '@archon-research/design-system/panda-preset';

export default defineConfig({
  presets: [designSystemPreset],
});
```

### Browse components

View available components and their stories at:
https://archon-research.github.io/uikit/

## Peer dependencies

- `react`: React UI library
- `react-dom`: React DOM rendering

## Key dependencies

- `@ark-ui/react`: Unstyled component primitives
- `@pandacss/dev`: CSS-in-JS styling solution

## See also

- [Live component preview](https://archon-research.github.io/uikit/)
- [Development guide](../../DEVELOPMENT.md#preview-site) for local component development
