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
import { Button, Card, Text } from '@archon-research/design-system';

export function Example() {
  return (
    <Card>
      <Text>Hello from the design system</Text>
      <Button onClick={() => console.log('clicked')}>Click me</Button>
    </Card>
  );
}
```

### Use design tokens

```typescript
import { defineConfig } from '@pandacss/dev';
import designSystemPreset from '@archon-research/design-system/panda-preset';

export default defineConfig({
  presets: [designSystemPreset],
});
```

## Migration from direct primitive imports

During the Ark migration, consuming apps should import primitives through `@archon-research/design-system` rather than directly from upstream primitive libraries.

Preferred:

```typescript
import { Tooltip, Tabs, Toggle, ToggleGroup, Switch } from '@archon-research/design-system';
```

Avoid:

```typescript
import { Tooltip } from '@ark-ui/react/tooltip';
import { Switch } from '@ark-ui/react/switch';
// Legacy clean-up target if present in consumer repos:
// import { Tooltip } from '@base-ui/react/tooltip';
```

Migration workflow:

1. In the uikit monorepo, run `npm run migration:audit-imports` from the repository root to audit workspace packages.
2. In consumer repos, run `./node_modules/.bin/uikit-cli audit-imports` to audit direct primitive imports.
3. Replace direct primitive imports with design-system entrypoints where an equivalent export exists.
4. Keep consumer linting on the `design-system-boundaries` oxlint preset so new violations surface during the migration window.
5. Once consumer repos are clean, Phase 3 can escalate warnings to errors.

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
