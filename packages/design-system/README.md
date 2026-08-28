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

Every module except the theme bootstrap is marked side-effect-free
(`"sideEffects": ["./dist/theme-bootstrap.js"]`), so importing only what you use is
fully tree-shakeable (a `Badge`-only import ships ~1 KB, not the Ark/TanStack engine).

### Use design tokens

This package **emits no CSS of its own** — it builds with `tsc`, ships no generated
`styled-system`, and applies its recipes by stable Panda class names. The consumer
generates the CSS. Two steps, both required: add the preset, *and* spread
`designSystemStaticCssRecipes` into `staticCss`. Without the second, the preset
registers the recipes but Panda generates no rules for them (nothing in your source
calls a recipe function for it to extract), and every component renders unstyled.
`staticCss` is a Panda ROOT-config key, so a preset cannot carry it.

```typescript
import { defineConfig } from '@pandacss/dev';
import { designSystemStaticCssRecipes } from '@archon-research/design-system';
import { designSystemPreset } from '@archon-research/design-system/panda-preset';

export default defineConfig({
  presets: [designSystemPreset],
  staticCss: {
    recipes: {
      ...designSystemStaticCssRecipes,
      // ...your own recipes with runtime-driven variants
    },
  },
});
```

The recipe definitions themselves are available from the root barrel and from the
`@archon-research/design-system/recipes` subpath. See
[PANDA_NOTES.md](./PANDA_NOTES.md) for this and the other Panda gotchas that bite
consumers of the preset.

### Theming and the no-flash bootstrap

`ThemeProvider` owns the theme at runtime: it resolves `light` / `dark` / `auto`,
persists the choice, and keeps `<html>`'s `dark` class and `data-theme` attribute
in sync.

```typescript
import { ThemeProvider, useTheme } from '@archon-research/design-system';
```

Because the provider applies the theme from an effect, it can only run *after*
React mounts. On a reload with a dark theme stored, the page paints light first
and then snaps to dark — a visible flash. To remove it, apply the theme before
first paint with the bootstrap this package ships. It reads the same storage keys
the provider does, so the two can never disagree.

Pick the mode that matches your CSP.

**1. Inline (SSR and any app that allows inline scripts).** Render
`THEME_BOOTSTRAP_SCRIPT` as the first `<script>` in `<head>`, ahead of your
stylesheets:

```tsx
import { THEME_BOOTSTRAP_SCRIPT } from '@archon-research/design-system';

export function Document() {
  return (
    <html lang="en">
      <head>
        <script>{THEME_BOOTSTRAP_SCRIPT}</script>
        {/* stylesheets after the bootstrap */}
      </head>
      <body>{/* … */}</body>
    </html>
  );
}
```

With a strict CSP that allows inline scripts only by nonce, pass yours through:
`<script nonce={nonce}>{THEME_BOOTSTRAP_SCRIPT}</script>`.

**2. Copied file (`script-src 'self'` — no inline scripts allowed).** The same
code is built to `dist/theme-bootstrap.js` as a plain browser script. Copy it
into the directory you serve static assets from, as part of your build (under
the `uikit-cli link` flow this file exists only after the linked checkout has
run `npm run build` — resolution through the symlink then works as normal):

```jsonc
// package.json
{
  "scripts": {
    "prebuild": "cp node_modules/@archon-research/design-system/dist/theme-bootstrap.js public/"
  }
}
```

Then load it first in `<head>`:

```html
<script src="/theme-bootstrap.js"></script>
```

Copy it on every build rather than committing it — it is generated from
`src/theme/theme-bootstrap.ts` at package build time, and copying keeps it in
step with the version you have installed.

**3. Neither?** If you can already run code before React renders (a bundled entry
module, a framework pre-render hook), call the function form instead:

```typescript
import { applyThemeBootstrap } from '@archon-research/design-system';

applyThemeBootstrap();
```

Or, as the first statement of your entry module, import the built script for its
side effect — the same code as the copied file in option 2, but bundled with your
app instead of served separately:

```typescript
import '@archon-research/design-system/theme-bootstrap.js';
```

This form is safe from tree-shaking: `dist/theme-bootstrap.js` is the sole entry in
the package's `sideEffects` list, so bundlers keep it even though the import binds no
name. Note that it runs when your entry bundle runs, not before the document's
stylesheets — put it above every other import, and prefer option 1 or 2 if your entry
bundle is deferred.

Every form makes the same decision: a stored `light` / `dark` wins, `auto` (and no
stored value) resolves against `prefers-color-scheme`, the pre-rename storage key
is still honoured, and unavailable storage falls back to the system preference
rather than throwing. When a bootstrap has run, `ThemeProvider` seeds its first
render from the `data-theme` it stamped, so the pre-paint decision and the
provider agree. Without one, the provider behaves exactly as before.

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
