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
