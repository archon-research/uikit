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

During the Ark migration, consuming apps should import primitives through `@archon-research/design-system` rather than directly from `@base-ui/react` or `@ark-ui/react`.

Preferred:

```typescript
import { Tooltip, Tabs, Toggle, ToggleGroup, Switch } from '@archon-research/design-system';
```

Avoid:

```typescript
import { Tooltip } from '@ark-ui/react/tooltip';
import { Switch } from '@base-ui/react/switch';
```

Migration workflow:

1. Run `npm run migration:audit-imports` from the repository root to find remaining direct imports.
2. Replace direct primitive imports with design-system entrypoints where an equivalent export exists.
3. Keep consumer linting on the `design-system-boundaries` oxlint preset so new violations surface during the migration window.
4. Once consumer repos are clean, Phase 3 can escalate warnings to errors.

### Browse components

View available components and their stories at:
https://archon-research.github.io/uikit/

## Peer dependencies

- `react`: React UI library
- `react-dom`: React DOM rendering

## Key dependencies

- `@base-ui/react`: Unstyled component primitives
- `@pandacss/dev`: CSS-in-JS styling solution

## See also

- [Live component preview](https://archon-research.github.io/uikit/)
- [Development guide](../../DEVELOPMENT.md#preview-site) for local component development
