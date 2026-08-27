# @archon-research/oxfmt-config

Shared Oxfmt (Oxc formatter) configuration for consistent code formatting.

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

## What the preset sets

| Option | Value | Effect |
| --- | --- | --- |
| `printWidth` | `80` | wrap target, in columns |
| `singleQuote` | `true` | `'a'` rather than `"a"` |
| `semi` | `true` | keep statement semicolons |
| `trailingComma` | `'all'` | trailing commas everywhere they are legal, including function arguments |
| `sortImports.enabled` | `true` | reorder import statements on format |

`sortImports` rewrites the order of your imports, so expect a large first diff
when adopting this config in an existing codebase.

## Format code

```bash
oxfmt . --write
```
