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
| `compiler` | `undefined` | Options forwarded to `babel-plugin-react-compiler` |

Excluded by default: `**/node_modules/**` and `**/styled-system/**` — Panda's
generated output, which every design-system consumer has and which contains no
components. Add your own generated trees:

```typescript
reactCompiler({ exclude: ['**/src/generated/**'] });
```

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

This package's own test asserts exactly that, against a real build.

## Linting for it

The compiler's own static analysis is available as the `react/react-compiler`
oxlint rule. It is not enabled by
[`@archon-research/oxlint-config`](../oxlint-config/README.md); a consumer that
wants the build and the lint to agree turns it on itself.
