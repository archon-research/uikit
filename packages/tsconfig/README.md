# @archon-research/tsconfig

Shared TypeScript configuration presets for projects across the organization.

## Installation

```bash
npm install --save-dev @archon-research/tsconfig typescript
```

## Usage

Extend the appropriate preset in your project's `tsconfig.json`:

### Base configuration

```json
{
  "extends": "@archon-research/tsconfig/base",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

### Node.js projects

```json
{
  "extends": "@archon-research/tsconfig/node"
}
```

### React projects

```json
{
  "extends": "@archon-research/tsconfig/react"
}
```

## Included presets

- **base** - General-purpose TypeScript configuration
- **node** - Configuration optimized for Node.js applications
- **react** - Configuration optimized for React projects with JSX support

## `noUncheckedIndexedAccess`

`base` enables `noUncheckedIndexedAccess`, so an indexed read (`arr[i]`,
`record[key]`) is typed `T | undefined`. This catches the case where a lookup
misses and the `undefined` flows onward instead of throwing — an unguarded
regex-group read or bucket lookup rendering `undefined` into a value.

Upgrading surfaces new errors in existing code. The migration is mechanical;
in rough order of preference:

```ts
const first = items[0] ?? fallback;         // a real default
const row = rows[i];
if (row === undefined) continue;            // a guard that narrows

// Where the index is provably in range (a modulo, or a loop bound), make the
// source a non-empty tuple so element 0 is typed:
const NAMES = ['a', 'b', 'c'] as const;
const name = NAMES[i % NAMES.length] ?? NAMES[0];
```

To defer it for a workspace, set `"noUncheckedIndexedAccess": false` in that
project's own `compilerOptions`.
