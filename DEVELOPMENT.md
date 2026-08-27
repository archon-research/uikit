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

### TypeScript toolchain

The repository is pinned to TypeScript 7 (`typescript` in the root `package.json`). Both
`npm run build` and `npm run type:check` invoke its `tsc` binary; there is no `tsgo` any more, since
the native compiler is now what `typescript` ships.

TypeScript 7.0 deliberately ships without a compiler API, so tools that import `typescript`
programmatically cannot run against it. Only `openapi-typescript` is affected here — see
[openapi-typescript#2841](https://github.com/openapi-ts/openapi-typescript/issues/2841). Rather than
downgrading the compiler everyone else uses, the `generate-openapi` bin runs that one tool from an
empty working directory, which makes `npx` resolve it in an isolated tree alongside a TypeScript that
still exposes the API. The trade-off is that generation uses the latest `openapi-typescript@7` from
the npx cache instead of the copy installed in the host project. Collapse it back to a plain
`npx openapi-typescript` call once the tool adopts the API that TypeScript 7.1 is expected to ship.

Because `openapi-typescript` declares a `typescript@^5.x` peer, `npm install` prints an unmet-peer
warning. Nothing resolves that peer at runtime, so it is cosmetic; `npm ci` is unaffected.

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

## Agent marketplace plugin workflow

The repository includes an internal plugin-marketplace package at `packages/agent-marketplace`.

Use it to maintain source-normalized skills and agents and to generate plugin outputs for Claude Code and Copilot CLI.

From repository root:

```bash
npm run generate --workspace @archon-research/agent-marketplace
```

```bash
npm run refresh --workspace @archon-research/agent-marketplace
```

```bash
npm run refresh:dry-run --workspace @archon-research/agent-marketplace
```

Validation checkpoints:

```bash
claude plugin validate .
claude plugin validate ./packages/agent-marketplace/claude-plugin
```

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
3. Runtime packages (`design-system`, `charting`, `dashboard-kit`, `router-kit`, `http-client-core`, `http-client-react`, `http-client-msw`, `webmcp`, `mcp-connect`, `mcp-relay`) ship a built library that consumer apps import. In local development they resolve through the npm-workspace symlink to that package's own `dist/`, so a change is picked up after a rebuild, not straight from `src/`.
4. `uikit-cli` links local package builds into consumer repositories to support fast co-development loops.

## Versioning

The repository uses lockstep versioning across all workspace packages.

The bump workflow runs `semantic-release` with Conventional Commits.

Git tags and GitHub releases are the source of truth for released versions.

`semantic-release` decides semantic version bump type from commit messages:

- `feat:` => minor
- `fix:` and other non-breaking changes => patch
- `!` or `BREAKING CHANGE:` => major

During release preparation, it runs `npm version ${nextRelease.version} --workspaces --no-git-tag-version` to align in-memory workspace versions for packaging and publishing. Those version edits are not committed back to the repository.

`semantic-release` creates the `release-<version>` tag and draft GitHub release, and then the publish workflow publishes from that release metadata.

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

### Affected-only prerelease publishing

A prerelease cut from a feature branch publishes only the packages that branch actually affects, instead of republishing byte-identical copies of everything else.

`bump.yml` runs `.github/scripts/affected-packages.mjs`, which diffs the branch against its merge-base with `origin/main`, maps each changed file to the workspace that owns it, and expands downstream over the workspace dependency graph (`dependencies`, `peerDependencies` and `devDependencies`). The resulting list is passed to the publish workflow's `packages` input, and both workflows log which packages were skipped.

It falls back to publishing everything whenever a change cannot be attributed to a single package -- root config, the lockfile, CI itself -- and whenever the diff cannot be computed. Over-publishing is safe; missing a package is not.

Three things worth knowing:

- **Only prerelease branches narrow the list.** Releases from `main` always publish the full set. To force a full publish from a branch, run the bump workflow with the `publish_all` input.
- **Versions can diverge across packages on the `dev` dist-tag.** `semantic-release` still bumps every `package.json` to the same version, but only the affected packages are published, so npm can carry `design-system@0.9.0-my-branch.4` alongside `charting@0.9.0-my-branch.3`. That resolves correctly -- every internal range is `*` and no package bundles a sibling -- but `@dev` is no longer guaranteed to be one coherent set.
- **Each package must declare the internal packages it uses.** The graph is built from the manifests, so an undeclared workspace dependency is an invisible edge, and its dependent can be skipped when it should have been republished.

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
- Key dependencies: `@ark-ui/react`, `@pandacss/dev`

### HTTP client core

- Package: `@archon-research/http-client-core`
- Purpose: Typed API client helpers and response validation
- Key dependencies: `openapi-fetch`, `zod`
- Peer dependency: `openapi-typescript`
- The `generate-openapi` bin shells out to `openapi-typescript`, which needs the classic TypeScript
  compiler API. Consumers must resolve `typescript` to 5.x or 6.x for it to run — see
  [TypeScript toolchain](#typescript-toolchain).

### HTTP client React bindings

- Package: `@archon-research/http-client-react`
- Purpose: React Query provider and hooks integration
- Key dependencies: `@tanstack/react-query`, `@archon-research/http-client-core`
- Peer dependency: `react`

### HTTP client MSW mocks

- Package: `@archon-research/http-client-msw`
- Purpose: Typed msw request handlers derived from the same generated OpenAPI `paths` type as the
  client and query layers, plus environment-neutral setup and stateful fixture helpers
- Key dependencies: `openapi-msw`
- Peer dependency: `msw`
- Entry points: the root export is environment-neutral; `/browser` wraps `setupWorker` and `/node`
  wraps `setupServer`, so neither environment's msw import reaches the other's bundle

### Tooling config packages

- `@archon-research/tsconfig` exports shared TS config presets
- `@archon-research/oxlint-config` exports `base` and `react` lint presets
- `@archon-research/oxfmt-config` exports a shared formatter preset
