# @archon-research/oxlint-config

Shared Oxlint configuration presets for consistent code quality across projects.

## Installation

```bash
npm install --save-dev @archon-research/oxlint-config oxlint
```

## Usage

Use the configuration presets in your `oxlint.config.ts`:

### Base configuration

```typescript
import baseConfig from '@archon-research/oxlint-config';
import { defineConfig } from 'oxlint';

export default defineConfig({
  ...baseConfig,
});
```

### React projects

```typescript
import reactConfig from '@archon-research/oxlint-config/react';
import { defineConfig } from 'oxlint';

export default defineConfig({
  ...reactConfig,
});
```

## Included presets

- **base** (default) - General linting rules
- **react** - Additional rules for React projects
