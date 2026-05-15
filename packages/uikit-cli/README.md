# @archon-research/uikit-cli

CLI tool for local package linking during active development with consumer repositories.

## Installation

```bash
npm install --save-dev @archon-research/uikit-cli
```

## Usage

### Run lint and format tools without downstream installs

From any consumer workspace:

```bash
uikit-cli lint -c ./.oxlintrc.ts src panda.config.ts vite.config.ts
uikit-cli format -c ./.oxfmtrc.ts --write "src/**/*.ts" "src/**/*.tsx" panda.config.ts vite.config.ts
```

The CLI runs pinned `oxlint` and `oxfmt` versions internally, so downstream workspaces do not
need to declare those tool packages directly.

### Register local uikit packages for downstream consumers

From the uikit repository:

```bash
uikit-cli register
```

This registers local public `@archon-research/*` packages globally via `npm link`, so downstream
consumer repositories can link by package name without needing package paths.

### Link uikit packages into a consumer repository

From your consumer repository:

```bash
uikit-cli link
```

This command links all `@archon-research/*` packages from your local uikit monorepo into your consumer project, allowing you to develop packages and see changes immediately.

Add this script to your consumer's `package.json`:

```json
{
  "scripts": {
    "uikit:link": "uikit-cli link",
    "uikit:unlink": "uikit-cli unlink"
  }
}
```

### Restore registry versions

When co-development is complete, restore published versions from npm:

```bash
uikit-cli unlink
```

## How it works

The CLI manages local development links by:

1. Auto-registering local `@archon-research/*` packages from your uikit checkout
2. Linking only consumer workspaces that actually depend on those packages
3. Reversing links with `unlink`, restoring registry installs when available

The CLI automatically detects the consumer workspace root and all dependent packages, working from any directory within the workspace.

The CLI auto-discovers the local uikit monorepo for typical sibling-checkout layouts.

## Requirements

- Local clone of the uikit monorepo
- Node.js and npm installed

## See also

- [Development guide](../../DEVELOPMENT.md#local-co-development-with-a-consumer-repository) for detailed local development workflow

## Development workflow

In a synome workspace:

```bash
# Optional: run once in uikit repo to pre-register packages
uikit-cli register

# Link uikit packages for local development
uikit-cli link

# Later, restore registry versions (or keep local links if not published)
uikit-cli unlink
```

## Scripts in synome package.json

- `uikit:link` — Uses the CLI with auto-detection
- `uikit:unlink` — Unlinks using the CLI
