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
