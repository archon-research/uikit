# @archon-research/oxfmt-config

Shared Oxfmt (Biome formatter) configuration for consistent code formatting.

## Installation

```bash
npm install --save-dev @archon-research/oxfmt-config oxfmt
```

## Usage

Use the configuration in your `oxfmt.config.ts`:

```typescript
import baseConfig from '@archon-research/oxfmt-config';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...baseConfig,
});
```

## Format code

```bash
oxfmt . --write
```
