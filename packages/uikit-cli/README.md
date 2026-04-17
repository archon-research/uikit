# @archon-research/uikit-cli

CLI for managing local uikit package linking in consumer workspaces.

## Installation

Once published to GitHub Packages, install globally:

```bash
npm install -g @archon-research/uikit-cli
```

For development, link locally:

```bash
cd /path/to/uikit/packages/uikit-cli
npm link
```

## Usage

### Link local uikit packages

```bash
uikit-cli link
```

Automatically detects the consumer workspace root by walking up to the nearest `package.json` with a `workspaces` field. Links all `@archon-research/*` packages that the consumer depends on.

### Unlink local packages (restore registry versions)

```bash
uikit-cli unlink
```

Attempts to unlink all local uikit packages and restore registered versions. If packages are not yet published, keeps local links in place.

### Working from any subdirectory

The CLI works from any directory within a workspace:

```bash
cd my-consumer/src/explorer
uikit-cli link  # auto-detects workspace root and links packages
```

## How it works

1. **Auto-detection**: Walks up from current working directory to find the nearest `package.json` with a `workspaces` field
2. **Discovery**: Queries locally available uikit packages and determines which ones are needed by consumer workspaces
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
