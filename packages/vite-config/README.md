# @archon-research/vite-config

Shared Vite build presets, so that wiring every app needs is written once.

## Installation

```bash
npm install --save-dev @archon-research/vite-config \
  vite @vitejs/plugin-react @rolldown/plugin-babel babel-plugin-react-compiler
```

The four packages are peer dependencies: the preset composes them, it does not
vendor them, so the app decides which versions its build runs on. Only the React
Compiler preset needs all four; [chunk groups](#chunk-groups) need nothing but
Vite. Vite 8 is required either way: both presets are built on rolldown.

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
19 of them. A consumer on that preset gets the build and the lint agreeing
without configuring anything.

They are named one at a time — `react/hooks`, `react/purity`,
`react/immutability`, `react/preserve-manual-memoization` and the rest — because
the umbrella `react/react-compiler` rule no longer exists. oxlint 1.79.0 split it
into one rule per compiler diagnostic, matching `eslint-plugin-react-hooks` v6,
and naming the old umbrella is now a hard config-parse failure:
`Rule 'react-compiler' not found in plugin 'react'`.

Five further split rules are deferred to `off` in that preset, each with its
reason and current finding count recorded beside it in
[`react.ts`](../oxlint-config/react.ts).

## Chunk groups

```typescript
import codeSplitting from '@archon-research/vite-config/code-splitting';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rolldownOptions: {
      output: { codeSplitting: codeSplitting() },
    },
  },
});
```

Three groups, named after the packages they hold:

| Chunk | Holds | Priority |
| --- | --- | --- |
| `react` | `react`, `react-dom`, `scheduler` | 30 |
| `design-system` | `@archon-research/design-system` and its dependency closure — Ark UI, the TanStack table and virtualizer, lucide | 20 |
| `charting` | `@archon-research/charting` and its closure, `@visx/*` included | 10 |

A group that matches nothing emits no chunk and costs nothing, so an app with no
charts can still take the preset whole.

### The option is `codeSplitting`, and the old spellings are worse than wrong

Vite 8 bundles with rolldown, so chunk groups live at
`build.rolldownOptions.output.codeSplitting.groups`. Two older spellings still
work, and neither fails in a way you would notice:

- `output.advancedChunks` takes the same `groups` array and logs `advancedChunks
  option is deprecated, please use codeSplitting instead.` Wrong, but it says so.
- `output.manualChunks` — the Rollup callback — logs nothing at all. rolldown
  compiles it into a single group with a dynamic `name()`, so it produces
  correctly named chunks and a stale snippet looks like it worked. What that
  single group cannot carry is `entriesAware`, which means a `manualChunks`
  build is permanently the flat grouping described below.

### Why `entriesAware`

Left flat, a group is one chunk. Every entry that needs any module in it
statically imports the whole thing — so a component used only behind a lazy
route ships in the entry anyway, along with whatever it pulls in. A consumer
measured 38 kB raw of drawer- and band-only design-system code arriving that way.

`entriesAware` splits the group by which entries actually reach each module,
into `design-system~app`, `design-system~drawer-route` and so on. The entry keeps
what it uses; the lazy route keeps the rest.

This is the half that makes the subpath exports pay off. Importing
`@archon-research/design-system/drawer` keeps the drawer out of the root barrel's
graph, and `entriesAware` keeps it out of the entry's chunk. Either one alone
leaves the code in the entry. The same holds for charting's `core`, `primitives`
and `xychart` subpaths: a route on `primitives` should not be waiting on
`@visx/xychart` because another route asked for it.

React is the deliberate exception and stays flat. Every entry needs it, so
splitting it per entry set would hand each lazy route a copy of what the entry
already loaded.

### What the groups match on, and what that trades

The design-system and charting groups match a directory name — `/[\\/]design-system[\\/]/` —
rather than `@archon-research/design-system`. Vite resolves with
`preserveSymlinks: false`, so a workspace or `npm link`ed package arrives under
its real path, `…/packages/design-system/dist/index.js`, with no scope segment
in it anywhere. A scoped pattern matches an installed layout and silently
matches nothing in a linked one: the build succeeds and the chunk just never
appears.

The cost is the opposite error, an app with its own `src/design-system/`
directory being swept in. That one is fixable from the outside, which is why it
is the error worth having:

```typescript
import codeSplitting, {
  GROUP_PRIORITIES,
} from '@archon-research/vite-config/code-splitting';

codeSplitting({
  groups: [
    {
      name: 'app-design',
      test: /[\\/]src[\\/]design-system[\\/]/,
      priority: GROUP_PRIORITIES.designSystem + 1,
    },
  ],
});
```

Your groups are appended after the shipped ones. Priority decides every overlap
and ties go to the group declared first — always one of the defaults — so taking
modules back from one means clearing its priority, not just appending. The
defaults are spaced by ten so an app group can sit between two of them.

React is the one group that insists on `node_modules`, since React is never a
workspace package and the bare word is too common to match on a path segment.
The alternation is anchored on both sides: `react` without the trailing
separator also matches `react-dom`, and without the leading one it matches
`lucide-react` and `@ark-ui/react`, which belong in the design chunk.

### What is not in the groups

Neither group names a single dependency of the package it captures. Ark UI,
lucide, the TanStack packages and visx all arrive through rolldown's
`includeDependenciesRecursively`, which this preset sets explicitly rather than
inheriting — the grouping is built on it, and a default that flips would be
silent. The alternative is this package holding a copy of two dependency lists
that go stale with nothing failing.

That recursion is also why `react` outranks the other two. React is a peer
dependency of both packages, so the closure reaches it, and whichever group
claims it first decides whether it is shared or duplicated.

### Confirming the groups fired

```bash
vite build
```

The chunk names are in the build's own output: `design-system~*` and
`charting~*` entries mean the groups fired and `entriesAware` split them. One
flat `design-system-[hash].js` means it did not.

This package's own tests assert the chunk assignment against real builds,
including the same build with and without `entriesAware`, and that a
scope-anchored pattern misses a linked package.
