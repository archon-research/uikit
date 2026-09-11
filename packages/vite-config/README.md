# @archon-research/vite-config

Shared Vite build presets, so that wiring every app needs is written once.

## Installation

```bash
npm install --save-dev @archon-research/vite-config \
  vite @vitejs/plugin-react @rolldown/plugin-babel babel-plugin-react-compiler
```

The four packages are peer dependencies: the preset composes them, it does not
vendor them, so the app decides which versions its build runs on. Vite 8 is
required: the preset is built on rolldown's plugin API.

## React Compiler

```typescript
import reactCompiler from '@archon-research/vite-config/react-compiler';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), reactCompiler()],
});
```

`react()` stays responsible for JSX and Fast Refresh; `reactCompiler()` adds the
compiler. Order matters only in that both must be present.

### Why this is not a `@vitejs/plugin-react` option

Vite 8 bundles with rolldown, whose transformer is Oxc, and Oxc does not run
Babel plugins. The React Compiler is a Babel plugin, so it arrives as a separate
Babel pass — `@rolldown/plugin-babel` carrying `reactCompilerPreset()` — rather
than as a `babel.plugins` entry on `react()`.

That preset ships a `code` filter and no `id` filter, which means every module
passing the code test is handed to Babel. Babel is the one part of the pipeline
that is not Oxc, so this preset adds the `id` filter the preset omits.

### Options

| Option | Default | Effect |
| --- | --- | --- |
| `exclude` | `[]` | Extra module ids kept out of the Babel pass, merged after the defaults rather than replacing them |
| `excludeStyledSystem` | `true` | Whether the default `styled-system` exclusion applies |
| `compiler` | `undefined` | Options forwarded to `babel-plugin-react-compiler` |

Excluded by default:

| Pattern | Why |
| --- | --- |
| `/[/\\]node_modules[/\\]/` | Dependencies ship compiled; also `@rolldown/plugin-babel`'s own default, restated so this preset does not depend on that default staying put |
| `/[/\\]styled-system[/\\](?!jsx[/\\])/` | Panda's generated output — style objects, token maps, type declarations — which every design-system consumer has and which holds no components |

The `jsx` carve-out is deliberate. Under `jsxFramework: 'react'` Panda generates
real `forwardRef` components into `styled-system/jsx/`, and this repo's own
shared Panda config sets exactly that. Since `exclude` only ever adds, a blanket
`styled-system` exclusion would skip the compiler on genuine components — so the
default is narrowed to the part of the tree that is component-free under every
Panda setting, rather than left for consumers to correct.

That leaves one assumption: that the segment means Panda's `outdir` at all. A
project where it does not — a hand-written `styled-system/` directory, say —
would hit exactly the failure this preset exists to prevent, a build that
type-checks, exits 0 and ships those components unoptimized, with no way to say
so through an append-only `exclude`. `excludeStyledSystem: false` drops that one
pattern:

```typescript
reactCompiler({ excludeStyledSystem: false });
```

`node_modules` is not part of the trade and stays out of the pass either way. It
is also `@rolldown/plugin-babel`'s own default `exclude`, applied to the pass
independently of the filter this preset sets, so an option to compile
dependencies would not work even if one existed.

Add your own generated trees:

```typescript
reactCompiler({ exclude: [/[/\\]src[/\\]generated[/\\]/] });
```

Regular expressions rather than globs, and the defaults are regexes for the
same reason: a string pattern is compiled by two different matchers.
`@rolldown/plugin-babel` compiles one copy with a bare `picomatch(pattern)`,
which defaults to `dot: false`, so a project living under `.cache/` or `.pnpm/`
drops out of a `**` glob entirely. rolldown's own id filter has no such blind
spot and is the one that decides for this wiring, which is why a glob is not
wrong here today — but it is right by way of which of the two gates happens to
be authoritative, and that is a plugin internal. A `RegExp` is
`pattern.test(id)` on both sides.

Leave `compiler` unset on React 19.2 and later. The compiler then emits calls
into `react/compiler-runtime`, which those versions ship; only an older React
needs an explicit `target`.

### Confirming it ran

An unwired compiler is silent — the build succeeds and produces the same output
it always did. The compiler's runtime import is the marker to look for, since
nothing else in an app imports it:

```bash
vite build --minify false
grep -rc 'react/compiler-runtime' dist/assets/*.js
```

This package's own tests assert exactly that, against real builds — including
that the excluded trees really do come out untouched.

## Linting for it

The compiler's own static analysis is available as oxlint rules, and the `react`
preset in [`@archon-research/oxlint-config`](../oxlint-config/README.md) enables
18 of them. A consumer on that preset gets the build and the lint agreeing
without configuring anything.

They are named one at a time — `react/hooks`, `react/purity`,
`react/immutability`, `react/preserve-manual-memoization` and the rest — because
the umbrella `react/react-compiler` rule no longer exists. oxlint 1.79.0 split it
into one rule per compiler diagnostic, matching `eslint-plugin-react-hooks` v6,
and naming the old umbrella is now a hard config-parse failure:
`Rule 'react-compiler' not found in plugin 'react'`.

Six further split rules are deferred to `off` in that preset, each with its
reason and current finding count recorded beside it in
[`react.ts`](../oxlint-config/react.ts).
