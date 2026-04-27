# @archon-research/uikit-cli

CLI tool for local package linking during active development with consumer repositories.

## Installation

```bash
npm install --save-dev @archon-research/uikit-cli
```

## Usage

### Link uikit packages into a consumer repository

From your consumer repository:

```bash
npm run uikit:link
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
npm run uikit:unlink
```

## How it works

The CLI manages workspace package links by:

1. Discovering linked `@archon-research` packages in your local uikit monorepo
2. Creating file links in your consumer repository's `node_modules`
3. Reversing the process with `unlink` to restore registry-installed packages

The CLI automatically detects the consumer workspace root and all dependent packages, working from any directory within the workspace.

## Requirements

- Local clone of the uikit monorepo
- Node.js and npm installed

## See also

- [Development guide](../../DEVELOPMENT.md#local-co-development-with-a-consumer-repository) for detailed local development workflow
3. **Linking**: Uses `npm link` to establish local package resolution
4. **Graceful fallback**: On unlink, checks if packages are published; if not, keeps local links to prevent breaking changes

## Development workflow

In a synome workspace:

```bash
# Link uikit packages for local development
npm run uikit:link

# Later, restore registry versions (or keep local links if not published)
npm run uikit:unlink
```

## Scripts in synome package.json

- `uikit:link` — Uses the CLI with auto-detection
- `uikit:unlink` — Unlinks using the CLI
