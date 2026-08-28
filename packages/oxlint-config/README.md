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
import baseConfig from '@archon-research/oxlint-config/base';
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

### React projects with design-system import governance

```typescript
import boundariesConfig from '@archon-research/oxlint-config/design-system-boundaries';
import { defineConfig } from 'oxlint';

export default defineConfig({
  ...boundariesConfig,
});
```

### Type-aware promise safety

```typescript
import typeAwareConfig from '@archon-research/oxlint-config/type-aware';
import { defineConfig } from 'oxlint';

export default defineConfig({
  ...typeAwareConfig,
});
```

This preset **only takes effect when both** of the following hold:

```bash
npm install --save-dev oxlint-tsgolint
oxlint --type-aware src
```

Without the flag and the package, the rules still appear in `--print-config`
but never execute — a run reports nothing and exits 0. `oxlint-tsgolint` ships
its binaries as plain platform-specific `optionalDependencies` with no install
script, so it works under `ignore-scripts=true`.

It denies the promise-safety family (`no-floating-promises`,
`no-misused-promises`, `await-thenable`, `no-base-to-string`) and explicitly
turns off the noisier style rules `--type-aware` otherwise enables
(`no-unsafe-type-assertion`, `consistent-return`, `no-unnecessary-type-assertion`,
`no-unnecessary-type-parameters`).

The rules are also exported on their own as `typeAwareRules`, for merging into
`base` rather than taking the React preset with them.

## Included presets

- **base** - General linting rules, including `import/no-cycle`
- **react** - `base` plus React rules, including Rules of Hooks
- **design-system-boundaries** - React rules plus an error on direct primitive imports from `@ark-ui/react` and its subpaths
- **type-aware** - React rules plus promise safety; requires `--type-aware` and `oxlint-tsgolint`

## Extending a preset

Add rules by merging into the preset's own `rules`, not by replacing them:

```typescript
export default defineConfig({
  ...reactConfig,
  rules: {
    ...reactConfig.rules, // without this, the preset's rules are discarded
    'no-console': 'error',
  },
});
```

Every preset declares a `rules` key, so this spread always type-checks. `react`
composes on `base` the same way, so a rule added to `base` reaches every preset.

### Changing a rule's severity

A bare severity string **replaces the entire rule entry**, including its
options. For a rule the preset configures with options, this silently drops
them:

```typescript
// WRONG — discards the restricted paths the preset carries, leaving a rule
// that restricts nothing.
'no-restricted-imports': 'warn',
```

Repeat the options alongside the new severity, or leave the preset's entry
alone.

## Warnings do not fail a run

`base` and `react` set the `correctness` and `suspicious` categories to `warn`,
and **oxlint exits 0 on warnings**. To make them gate anything, pass
`--max-warnings=0` (or `--deny-warnings`). `uikit-cli lint` applies
`--max-warnings=0` by default; a direct `oxlint` invocation does not.

Note also that raising `categories` on the consumer side does not change a rule
the preset configures by name — per-rule severity wins over category severity.
