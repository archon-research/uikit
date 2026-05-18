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

Example for stl-verify:
```bash
cd /path/to/stl-verify/ts
npm link @archon-research/uikit-cli --workspace ui
```

## Usage

### Run lint and format tools without downstream installs

From any consumer workspace:

```bash
./node_modules/.bin/uikit-cli lint -c ./.oxlintrc.ts src panda.config.ts vite.config.ts
./node_modules/.bin/uikit-cli format -c ./.oxfmtrc.ts --write "src/**/*.ts" "src/**/*.tsx" panda.config.ts vite.config.ts
```

The CLI runs pinned `oxlint` and `oxfmt` versions internally, so downstream workspaces do not
need to declare those tool packages directly.

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
2. Linking only consumer workspaces that actually depend on those packages
3. Cleaning up shadow installs and Vite caches to ensure symlinks work correctly
4. Using `--preserve-symlinks` flag and bundling to avoid ES module resolution issues

The CLI automatically detects the consumer workspace root and all dependent packages, working from any directory within the workspace.

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
