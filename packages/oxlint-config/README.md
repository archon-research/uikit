# @archon-research/oxlint-config

Shared Oxlint configuration presets for consistent code quality across projects.

## Installation

```bash
npm install --save-dev @archon-research/oxlint-config oxlint
```

**Requires oxlint 1.79.0 or later.** The `react` preset names the React Compiler
rules that oxlint split out of the old umbrella `react/react-compiler` rule in
1.79.0 — 24 of them: 19 at `error`, plus 5 held at `off`. 22 of those 24 do not
exist in 1.78.0; only `react/no-clone-element` and `react/no-react-children`
predate the split. The 5 held at `off` are not a free pass — an unrecognised
name is rejected whatever it is set to. Loading the preset on an older oxlint
fails during config parsing with `Rule ... not found in plugin 'react'`, not at
lint time, so the whole run aborts rather than silently skipping the rules.

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

### React projects, with the opt-in strict rules

```typescript
import reactStrictConfig from '@archon-research/oxlint-config/react-strict';
import { defineConfig } from 'oxlint';

export default defineConfig({
  ...reactStrictConfig,
});
```

`react` plus the two `restriction`-category rules it deliberately leaves out:
`typescript/no-explicit-any` and `react/only-export-components`. Both sit in a
category `base`'s `correctness` + `suspicious` never reaches, so naming them is
the only thing that turns them on.

**This repo does not adopt this preset, and does not pass it.** Measured across
all 16 workspaces: `no-explicit-any` is clean (via one documented line-scoped
suppression in `http-client-react`), but `only-export-components` has **76
violations here** and none of them are bugs. They are exported hooks living
beside the provider that backs them, unexported compound-component parts, and
barrel entrypoints — the layout a component library is supposed to have.

That is the adoption story in one line: **`only-export-components` is for
applications, not for libraries.** It is Fast-Refresh hygiene, and Fast Refresh
is a property of an app's dev server; a published library's modules are not the
boundaries the consumer's HMR reloads. Adopt it in an app, where a mixed-export
module really does cost you a full reload instead of preserved state. Do not
expect a component library to satisfy it.

Because the two halves diverge that sharply, each is also exported on its own so
a consumer can take one axis without the other:

```typescript
import reactConfig from '@archon-research/oxlint-config/react';
import { noExplicitAnyRules } from '@archon-research/oxlint-config/react-strict';

export default defineConfig({
  ...reactConfig,
  rules: { ...reactConfig.rules, ...noExplicitAnyRules },
});
```

`noExplicitAnyRules`, `fastRefreshRules`, and `reactStrictRules` (both) are all
available.

#### `no-explicit-any` cannot be scoped to value positions

There is no configuration that allows `any` in a type or generic-constraint
position while denying it in a value position. oxlint's schema for the rule is
`additionalProperties: false` over exactly `fixToUnknown` and `ignoreRestArgs`.
So a constraint that genuinely requires `any` — where `unknown` would break
inference rather than tighten it — has to be suppressed at the site with
`// oxlint-disable-next-line typescript/no-explicit-any` and a comment saying
why. Keep it to the one line; a file- or package-level disable hides the trade
instead of recording it.

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
- **react-strict** - React rules plus `no-explicit-any` and `only-export-components`; opt-in, and aimed at applications rather than libraries
- **design-system-boundaries** - React rules plus an error on direct primitive imports from `@ark-ui/react` and its subpaths
- **type-aware** - React rules plus promise safety; requires `--type-aware` and `oxlint-tsgolint`

### Naming

Variants are named `<base-preset>-<what-it-adds>`: the prefix says which preset
they compose on, the suffix says which axis they tighten. A preset for the
pedantic module-size rules (`max-lines`, `max-lines-per-function`,
`import/max-dependencies`) has been proposed and belongs here as
**`react-structure`** under this scheme.

Prefixing by severity instead — `strict-react`, `strict-structure` — would
fragment the namespace, grouping some variants by the preset they extend and
others by how strict they are, and leave a reader scanning the exports map to
work out which one holds what.

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
