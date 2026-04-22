# uikit

Shared frontend toolkit monorepo for TypeScript and React projects.

It contains reusable configuration packages, a UI design-system package, and HTTP client utilities that can be consumed directly from source during local development.

## Repository layout

```text
packages/
  tsconfig/         Shared TypeScript configs (base, react, node)
  oxlint-config/    Shared Oxlint configs (base, react)
  oxfmt-config/     Shared Oxfmt config
  design-system/    Shared UI components and style recipes
  http-client-core/ OpenAPI + Zod based HTTP client helpers
  http-client-react/React Query integration on top of core client
  uikit-cli/        CLI for local package linking in consumer repos
```

## Packages

- `@archon-research/tsconfig`
- `@archon-research/oxlint-config`
- `@archon-research/oxfmt-config`
- `@archon-research/design-system`
- `@archon-research/http-client-core`
- `@archon-research/http-client-react`
- `@archon-research/uikit-cli`

If you are adapting this template for another organization, you can replace the package scope and names while keeping the same structure and workflows.

## Installation

```bash
git clone <your-repo-url>
cd uikit
npm ci
```

## Usage

### Run quality checks

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

### Use shared toolchain configs in a consumer workspace

```ts
// oxlint.config.ts
import reactConfig from '@archon-research/oxlint-config/react';
import { defineConfig } from 'oxlint';

export default defineConfig({
  ...reactConfig,
});
```

```ts
// oxfmt.config.ts
import baseConfig from '@archon-research/oxfmt-config';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...baseConfig,
});
```

### Local co-development with a consumer repository

Use workspace dependencies inside this repository and link packages into a consumer repository during active development.

```bash
# from consumer repo
npm run uikit:link

# later, restore registry versions where available
npm run uikit:unlink
```

## How it works

1. Workspaces under `packages/*` are resolved through npm workspaces.
2. Shared config packages (`tsconfig`, `oxlint-config`, `oxfmt-config`) provide reusable defaults for consumer apps.
3. Runtime packages (`design-system`, `http-client-core`, `http-client-react`) are consumed directly from source in local development.
4. `uikit-cli` links local package builds into consumer repositories to support fast co-development loops.

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

This repository includes a lightweight preview stack that avoids Storybook:

- Ladle for interactive component stories
- Panda Studio for token and theme inspection
- A static component-level token mapping page

The preview package consumes the shared Panda theme configuration from the
design-system package rather than defining a separate theme.

Run local preview surfaces:

```bash
npm run preview:dev:stories
npm run preview:dev:studio
```

Build the static preview artifact:

```bash
npm run preview:build
```

Output is written to `packages/uikit-preview/dist`.

Deployment model:

- Main branch deploys to GitHub Pages root
- Pull requests deploy to `pr/<number>/` paths on the `gh-pages` branch
- PR comments are updated with preview links
- PR close triggers cleanup of the corresponding `pr/<number>/` folder

## Versioning

The repository uses lockstep versioning across all workspace packages.

The bump workflow runs `semantic-release` with Conventional Commits.

`semantic-release` decides semantic version bump type from commit messages:

- `feat:` => minor
- `fix:` and other non-breaking changes => patch
- `!` or `BREAKING CHANGE:` => major

During release preparation, it runs `npm version ${nextRelease.version} --workspaces --no-git-tag-version --no-include-workspace-root` to keep workspace package versions in sync, commits those changes, tags with `release-<version>`, and opens a draft GitHub release.

## Release and publish

Preview release behavior without publishing:

```bash
npm run release:dry-run
```

Prepare publishable workspace artifacts:

```bash
npm run prepare
```

Publish workspace packages:

```bash
npm run publish:workspaces
```

By default this repository is configured for GitHub Packages, but the same workflow works with npmjs or another registry by changing `publishConfig` and auth setup.
