# uikit

Shared frontend scaffold for Archon projects.

## Packages

- @archon-research/tsconfig
- @archon-research/eslint-config
- @archon-research/prettier-config
- @archon-research/design-system
- @archon-research/http-client-core
- @archon-research/http-client-react

## Local co-development

Use workspace dependencies inside this repository and local file dependencies from consumer repositories during active development.

## Pre-commit hooks

Install git hooks:

```bash
npm run install-hooks
```

Run pre-commit checks manually:

```bash
npm run hooks:pre-commit
```

## Versioning with changesets

Create a changeset entry:

```bash
npm run changeset
```

The `changesets-bump` workflow creates/updates a version PR on `main` using pending changesets.

## Publishing

Initial publishing target is GitHub Packages under the @archon-research scope.
