# @archon-research/uikit-cli

CLI tool for local package linking during active development with consumer repositories.

## Setup (One-time)

### 1. Configure npm prefix for writable global packages

If using nix-managed Node.js, configure npm to use a writable location:

```bash
npm config set prefix ~/.npm-global
```

Add to your shell profile (e.g., `~/.zshrc`):
```bash
export PATH="$HOME/.npm-global/bin:$PATH"
```

### 2. Link CLI in uikit monorepo

From the uikit repository root:

```bash
npm link --workspace packages/uikit-cli
```

This makes the CLI available globally via workspace linking.

### 3. Link CLI into consumer repository

From your consumer repository root:

```bash
npm link @archon-research/uikit-cli --workspace <workspace-name>
```

Example for a consuming project:
```bash
cd /path/to/your-project/ts
npm link @archon-research/uikit-cli --workspace ui
```

## Usage

### Run lint and format tools without downstream installs

From any consumer workspace:

```bash
./node_modules/.bin/uikit-cli lint -c ./.oxlintrc.ts src panda.config.ts vite.config.ts
./node_modules/.bin/uikit-cli format -c ./.oxfmtrc.ts --write "src/**/*.ts" "src/**/*.tsx" panda.config.ts vite.config.ts
```

The CLI runs uikit-cli-managed `oxlint` and `oxfmt` versions internally (resolved via its
lockfile), so downstream workspaces do not need to declare those tool packages directly.

Both commands fill in a config flag when you omit one and the file is present in the current
directory — `oxlint.config.ts` for `lint`, `.oxfmtrc.ts` for `format`. Neither tool discovers
those files reliably on its own (`oxfmt` only auto-discovers the `.json` form, and `oxlint`
resolves relative to the current directory), so a run started from elsewhere — a git hook,
typically, where the current directory is the repo root — would otherwise lint or format with
built-in defaults and pass clean. Pass `-c` yourself to override.

`lint` also applies `--max-warnings=0` by default, because `oxlint` exits 0 on warnings and
the shared presets set the `correctness` and `suspicious` categories to `warn`. Pass your own
`--max-warnings` or `--deny-warnings` to change that.

If your consumer workspace prefers to run tooling directly, it can install and invoke
`oxlint`/`oxfmt` itself. In that setup, `@archon-research/oxlint-config` and
`@archon-research/oxfmt-config` remain reusable config packages, while `uikit-cli` remains an
optional workflow wrapper.

### Check a generated stylesheet for silently-dropped CSS

```bash
./node_modules/.bin/uikit-cli doctor                      # finds styled-system/styles.css
./node_modules/.bin/uikit-cli doctor path/to/styles.css   # explicit path
./node_modules/.bin/uikit-cli doctor --codegen            # runs `panda cssgen` itself
```

Use `--codegen` when you use the Panda PostCSS plugin and never write a frozen
`styled-system/styles.css`.

Findings carry a severity. `doctor` exits non-zero on any **error**, so it gates CI;
**warnings** are printed and do not affect the exit code. Only roleless `colorPalette` can
warn — see [error or warning](#roleless-colorpalette-error-or-warning) below.

The design system's authoring model has failure modes that produce *no error anywhere* — the
build passes, the console is clean, and the style simply does not apply. `doctor` scans the
generated stylesheet for them:

| Check | Severity | What silently breaks |
| --- | --- | --- |
| `missing-static-css` | error | No design-system recipe classes were emitted at all, so runtime-selected variants (status tones, dense tables, drawer sizes) render unstyled. Fix by spreading `designSystemStaticCssRecipes` into your Panda config's `staticCss.recipes`. |
| `unresolved-token` | error | A declaration whose value is a bare `token.path` (e.g. `color: text.subtle`) rather than a `var(--…)`. Invalid CSS the browser drops. |
| `roleless-color-palette` | error or warning | A `colorPalette` value that defines no role for the property styled with it — `var(--colors-color-palette-solid-bg)` is well-formed but undefined in that scope, so the browser drops the declaration. Only `neutral`, `gray`, `green`, `red`, `amber` and `blue` carry full role sub-tokens; other hues map the 50–950 scale only. |

#### Roleless `colorPalette`: error or warning

A role reference is only a *definite* miss when every `colorPalette` its scope can be set to
lacks the role — then no combination of that recipe's variants avoids the dropped declaration.
When some assignable palette does define the role, the breaking pairing is possible but
unproven: a recipe exposing `colorPalette: violet` alongside a `solid` emphasis variant may
never combine the two in an app, and the stylesheet cannot say. That is reported as a warning —
worth printing, not worth failing a build over.

| Palettes assignable in the scope | Which lack the role | Severity | Exit code |
| --- | --- | --- | --- |
| one | it does | error | non-zero |
| several | all of them | error | non-zero |
| several | some of them | warning | 0 |
| several | none | no finding | 0 |
| none (no `colorPalette` assigned in scope) | — | no finding | 0 |

#### Roleless `colorPalette`: detection boundary

Resolving which palette applies to a declaration is the CSS cascade, and `doctor` does not
simulate it. It resolves exactly one scope — a **recipe**, keyed by the class-name stem Panda
derives from `className` — and flags a role reference only when a palette assigned somewhere in
that same recipe's classes fails to define the role. Slots share the scope, since the root slot's
palette properties cascade into the others.

These cases are *not* flagged, on purpose, because scope is ambiguous and a false pass is far
cheaper than a false failure:

- atomic utilities (`.color-palette_violet` plus a separate `.bg_colorPalette\.solid\.bg`) — the
  stylesheet cannot prove the two classes land on the same element, nor that an ancestor already
  supplied the role;
- a palette set on an outer recipe with the role consumed by an inner one;
- `var(--colors-color-palette-…, fallback)` — a fallback means the declaration survives.

The palette→roles map is read out of the stylesheet itself (each `colorPalette` assignment
ruleset *is* the preset's role tokens in generated form), so palettes added to the preset — or
defined in a consumer's own preset extension — are covered with no list to keep in sync.

### Register the local uikit packages

```bash
./node_modules/.bin/uikit-cli register
```

Runs `npm link` in every local `@archon-research/*` package so they are available to link
from. `link` and `unlink` do this themselves, so run it directly only to register the
packages without touching a consumer. Pass `--uikit-root <path>` when the uikit checkout
cannot be auto-discovered.

### Link uikit packages into a consumer repository

From your consumer repository:

```bash
./node_modules/.bin/uikit-cli link
```

This command links all `@archon-research/*` packages from your local uikit monorepo into your consumer project, allowing you to develop packages and see changes immediately.

Verify links are working:
```bash
./node_modules/.bin/uikit-cli link --verify
```

Add this script to your consumer's `package.json`:

```json
{
  "scripts": {
    "uikit:link": "./node_modules/.bin/uikit-cli link",
    "uikit:unlink": "./node_modules/.bin/uikit-cli unlink"
  }
}
```

### Restore registry versions

When co-development is complete, restore published versions from npm:

```bash
./node_modules/.bin/uikit-cli unlink
```

## How it works

The CLI manages local development links by:

1. Auto-registering local `@archon-research/*` packages from your uikit checkout via `npm link`
2. Linking only the consumer workspaces that actually depend on those packages
3. Cleaning up shadow installs and Vite caches to ensure symlinks work correctly
4. Using `--preserve-symlinks` flag and bundling to avoid ES module resolution issues

The CLI automatically detects the consumer root and all dependent packages, working from any
directory within the project. Both consumer shapes are supported: an **npm-workspaces monorepo**
(the root with a `workspaces` field), and a **single package** that installs uikit directly (no
`workspaces` field) — in the single-package case the root package is linked directly.

The CLI auto-discovers the local uikit monorepo for typical sibling-checkout layouts.

## Requirements

- Local clone of the uikit monorepo
- Node.js 24+ and npm installed
- Writable npm prefix configured (see Setup)

## Troubleshooting

### "EACCES: permission denied" when using npm link

You need to configure npm to use a writable prefix location. See Setup step 1 above.

### "ENOENT: no such file or directory" errors

Use the workspace-based linking approach (Setup steps 2-3) instead of global npm link. The CLI bundle includes `--preserve-symlinks` to handle ES module resolution with symlinks.

### Links not working after linking

Run with `--verify` flag to check link status:
```bash
./node_modules/.bin/uikit-cli link --verify
```

### `useTheme must be used within ThemeProvider` (duplicated React context) after linking

With `resolve.preserveSymlinks: true` (which linking relies on) Vite can serve a linked package
under **two** URLs at once — `/node_modules/…` (the root symlink) and `/@fs/…` (the real path) —
producing two module graphs and two copies of singletons like `ThemeContext`. A component and its
`ThemeProvider` then hold different context objects and the hook throws. This is a link artifact,
not a bug in the app or the design system.

To confirm: look for the same module served at both URLs in the dev server (both HTTP 200). To
recover: run `uikit-cli unlink` and restart the dev server (touch the Vite config so it
re-optimizes) — the module collapses back to a single URL. To stay linked, add the linked
package(s) plus `react`/`react-dom` to your Vite `resolve.dedupe`, or drop `preserveSymlinks`.

### A partial link reported as success

If `link` prints that some packages did **not** link (PARTIAL), the named packages may still
resolve to a stale registry version. A consumer `.npmrc` with `min-release-age` is the usual
cause — npm rejects a fresh prerelease with `ETARGET`. Re-run with an override (e.g.
`--min-release-age=0`) or link those packages manually.

### The CLI cannot repair a stale copy of itself

`link` links `@archon-research/*` into the consumer — and that includes `uikit-cli` itself. So
`npm run uikit:link` runs whatever `uikit-cli` is currently in the consumer's `node_modules`: if
that copy is **stale**, the old code runs, and no source fix can change the run that needs it (a
stale binary can't even report its own staleness). When developing the CLI, or right after pulling
CLI changes, bypass the linked copy and invoke the monorepo's freshly-built binary directly so you
always run current code:

```bash
npm run build --workspace packages/uikit-cli   # in the uikit checkout
node <path-to-uikit>/packages/uikit-cli/dist/cli.js link --uikit-root <path-to-uikit>
```

Or install the published version from the registry, which sidesteps linking entirely.

## Development workflow

In a consumer workspace:

```bash
# One-time setup (see Setup section above)
npm link @archon-research/uikit-cli --workspace <workspace-name>

# Link uikit packages for local development
npm run uikit:link

# Verify links
npm run uikit:link -- --verify

# Later, restore registry versions
npm run uikit:unlink
```

## Debug mode

Run with debug output:
```bash
UIKIT_DEBUG=1 ./node_modules/.bin/uikit-cli link --verify
```

Or use the `--debug` flag:
```bash
./node_modules/.bin/uikit-cli link --debug --verify
```
