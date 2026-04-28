# Development Guide

This guide covers local development, testing, building, and publishing this monorepo.

## Setup from source

Clone the repository and install dependencies:

```bash
git clone https://github.com/archon-research/uikit
cd uikit
npm ci
```

### GitHub Packages authentication

To install workspace dependencies from GitHub Packages during development, configure a personal access token (PAT):

1. Create a PAT on GitHub with `read:packages` scope
2. Create or edit `~/.npmrc`:
   ```
   //npm.pkg.github.com/:_authToken=ghp_YOUR_TOKEN_HERE
   @archon-research:registry=https://npm.pkg.github.com
   ```

This allows `npm ci` and `npm install` to resolve `@archon-research` packages from GitHub Packages.

## Quality checks

Run linting and formatting checks across all workspaces:

```bash
# Lint all workspaces
npm run lint

# Auto-fix lint issues where possible
npm run lint:fix

# Check formatting
npm run format:check

# Apply formatting
npm run format
```

## Pre-commit hooks

Install git hooks:

```bash
npm run install-hooks
```

Run pre-commit checks manually:

```bash
npm run hooks:pre-commit
```

The hooks run repository-wide lint and format checks and also normalize trailing whitespace and end-of-file newlines on staged files.

## Preview site

This repository includes a lightweight preview stack using Ladle for interactive component stories.

Live preview: https://archon-research.github.io/uikit/

The preview package reuses the shared Panda theme configuration from the design-system package.

Run local preview:

```bash
npm run preview:dev
```

Build the static preview artifact:

```bash
npm run preview:build
```

Output is written to `packages/uikit-preview/dist`.

Deployment model:

- Main branch deploys to GitHub Pages root (`/`)
- Pull requests deploy to `pr/<number>/` paths on the `gh-pages` branch
- PR comments are updated with the branch preview link
- PR close triggers cleanup of the corresponding `pr/<number>/` folder

## Local co-development with a consumer repository

To actively develop uikit packages alongside a consumer repository, use workspace dependencies and link packages:

1. **Inside this uikit repository**, use workspace dependencies in package.json:
   ```json
   {
     "dependencies": {
       "@archon-research/http-client-core": "*"
     }
   }
   ```

2. **From a consumer repository**, link uikit packages during development:
   ```bash
   npm run uikit:link
   ```

3. **Later, restore registry versions** when co-development is complete:
   ```bash
   npm run uikit:unlink
   ```

See `uikit-cli` package documentation for more details.

## How packages are structured

1. Workspaces under `packages/*` are resolved through npm workspaces.
2. Shared config packages (`tsconfig`, `oxlint-config`, `oxfmt-config`) provide reusable defaults for consumer apps.
3. Runtime packages (`design-system`, `http-client-core`, `http-client-react`) are consumed directly from source in local development.
4. `uikit-cli` links local package builds into consumer repositories to support fast co-development loops.

## Versioning

The repository uses lockstep versioning across all workspace packages.

The bump workflow runs `semantic-release` with Conventional Commits.

`semantic-release` decides semantic version bump type from commit messages:

- `feat:` => minor
- `fix:` and other non-breaking changes => patch
- `!` or `BREAKING CHANGE:` => major

During release preparation, it runs `npm version ${nextRelease.version} --workspaces --no-git-tag-version` to keep workspace and repository root package versions in sync, commits those changes, tags with `release-<version>`, and opens a draft GitHub release.

## Release and publish

### Preview release behavior without publishing

```bash
npm run release:dry-run
```

### Prepare publishable workspace artifacts

```bash
npm run prepare
```

### Publish workflow (CI automated)

This monorepo publishes to both GitHub Packages and npm registry via GitHub Actions:

1. **On release**: When a draft GitHub release is created with tag `release-X.Y.Z`
2. **On workflow dispatch**: Manual trigger from a branch (including non-main branches)

The publish workflow:
- Resolves metadata (tag, version, npm tag)
- Checks out the specified ref
- Installs workspace dependencies (linking internal packages)
- Sets workspace versions
- Publishes to GitHub Packages with GITHUB_TOKEN
- Publishes to npm registry with OIDC trusted publishing (no token needed)
- Uploads release assets and marks release as published

### Dev version publishing

When manually triggering the publish workflow from a non-main branch:

- Version is appended with `-dev${RUN_ID}` (e.g., `0.1.0-dev25002729424`)
- npm dist-tag is set to `dev`
- Release upload and finalization are skipped

This allows testing publish workflows and dev releases from feature branches.

### Local manual publishing (not recommended for production)

For local testing only:

```bash
# Prepare packages
npm run prepare

# Publish to GitHub Packages (requires ~./npmrc config)
npm publish --workspaces --registry https://npm.pkg.github.com --scope @archon-research --tag dev

# Publish to npm registry (requires npm login)
npm publish --workspaces --registry https://registry.npmjs.org
```

## Key components and dependencies

### Design system

- Package: `@archon-research/design-system`
- Purpose: Shared UI primitives and recipes
- Key dependencies: `@base-ui/react`, `@pandacss/dev`

### HTTP client core

- Package: `@archon-research/http-client-core`
- Purpose: Typed API client helpers and response validation
- Key dependencies: `openapi-fetch`, `zod`
- Peer dependency: `openapi-typescript`

### HTTP client React bindings

- Package: `@archon-research/http-client-react`
- Purpose: React Query provider and hooks integration
- Key dependencies: `@tanstack/react-query`, `@archon-research/http-client-core`
- Peer dependency: `react`

### Tooling config packages

- `@archon-research/tsconfig` exports shared TS config presets
- `@archon-research/oxlint-config` exports `base` and `react` lint presets
- `@archon-research/oxfmt-config` exports a shared formatter preset
