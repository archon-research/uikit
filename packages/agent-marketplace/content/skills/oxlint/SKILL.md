---
name: oxlint
description: Use for day-to-day linting in this monorepo once Oxlint is already set up; covers config choices, package-level commands, and safe fix workflow.
---

# Oxlint Daily Workflow

Use this skill for normal linting and lint-fix work in this repository after migration is complete.

## Repository Conventions

- Package-level lint command pattern: `oxlint -c oxlint.config.ts <paths>`.
- Shared presets live in `packages/oxlint-config`:
  - `base.ts`
  - `react.ts`
  - `design-system-boundaries.ts`
- Most packages keep rule categories as warnings (`correctness`, `suspicious`) to reduce noisy CI breakage while still surfacing issues.

## Typical Commands

From repository root:

```bash
npm run lint --workspace <workspace-name>
npm run lint:fix --workspace <workspace-name>
```

For all workspaces:

```bash
npm run lint
```

## Editing Rules Safely

1. Prefer reusing shared presets from `@archon-research/oxlint-config`.
2. Keep local package overrides minimal and documented by intent.
3. Use `warn` first for new rule groups, then tighten after baseline cleanup.
4. For design-system consumers, prefer the boundaries preset to discourage direct `@ark-ui/react` imports.

## Fix Strategy

1. Run lint without fixes to inspect findings.
2. Run `lint:fix` only on the package you are touching.
3. Re-run lint to confirm no new violations.
4. Avoid mass unrelated fixes outside the task scope.

## CI Alignment

- Ensure package lint scripts can run independently (`npm run lint --workspace ...`).
- If linting depends on generated/build artifacts, make that dependency explicit in CI job steps.
