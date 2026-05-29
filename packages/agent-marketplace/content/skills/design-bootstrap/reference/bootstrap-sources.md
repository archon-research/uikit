# Bootstrap Sources

Use this map when drafting `PRODUCT.md`, `DESIGN.md`, and `PREVIEW.md`.

## Generated Token and Recipe Artifacts

- `packages/uikit-preview/static/tokens/spec/semantic-tokens.json`
- `packages/uikit-preview/static/tokens/spec/recipes.json`
- `packages/uikit-preview/static/tokens/spec/tokens.json`
- `packages/uikit-preview/static/tokens/spec/text-styles.json`
- `packages/uikit-preview/static/tokens/spec/patterns.json`
- `packages/uikit-preview/static/tokens/spec/color-palette.json`

## Design-System Source Contracts

- `packages/design-system/panda.shared.ts`
- `packages/design-system/src/panda-preset.ts`
- `packages/design-system/src/recipes/segmentedControl.recipe.ts`
- `packages/design-system/src/recipes/switch.recipe.ts`
- `packages/design-system/src/components/data-table/recipes.ts`

## Preview and Verification Sources

- `packages/uikit-preview/src/stories/atoms/segmented-control.stories.tsx`
- `packages/uikit-preview/src/stories/organisms/data-table.stories.tsx`
- `packages/uikit-preview/src/stories/`
- `packages/uikit-preview/tests/snapshot.spec.ts`
- `packages/uikit-preview/tests/snapshot.spec.ts-snapshots/`

## Commands

- Regenerate token artifacts:
  - `npm run generate --workspace @archon-research/uikit-preview`
- Verify visual baseline:
  - `npm run snapshot:test --workspace @archon-research/uikit-preview`
