---
name: oxfmt
description: Use for day-to-day formatting in this monorepo once Oxfmt is already set up; covers config reuse, safe write/check flows, and import sorting behavior.
---

# Oxfmt Daily Workflow

Use this skill for normal formatting tasks in this repository after migration is complete.

## Repository Conventions

- Shared formatter preset lives in `packages/oxfmt-config/index.ts`.
- Typical package config delegates to `@archon-research/oxfmt-config`.
- Current shared defaults include:
  - `printWidth: 80`
  - `singleQuote: true`
  - `semi: true`
  - `trailingComma: 'all'`
  - `sortImports.enabled: true`

## Typical Commands

From repository root:

```bash
npm run format --workspace <workspace-name>
npm run format:check --workspace <workspace-name>
```

For all workspaces:

```bash
npm run format
npm run format:check
```

## Safe Formatting Flow

1. Run `format:check` first to preview drift.
2. Run `format` only in the workspace you are changing.
3. Review import reordering and any large generated diffs before commit.
4. Re-run `format:check` to confirm clean state.

## Practical Notes

- Import sorting is enabled globally; expect reordered import blocks.
- Keep one-off formatting exceptions rare; prefer shared config consistency.
- If a package requires a local override, add the smallest possible override in that package's `oxfmt.config.ts`.

## CI Alignment

- Ensure `format:check` runs in CI for all workspaces.
- Avoid mixing broad formatting rewrites with unrelated feature changes.
