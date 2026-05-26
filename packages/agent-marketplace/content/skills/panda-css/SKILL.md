---
name: panda-css
description: WHEN building or refining styles in this repository; use Panda CSS tokens, recipes, and slot recipes aligned with the design-system package.
---

# Panda CSS Guidance For UIKit

Use this skill when editing styled UI in this monorepo.

## Ground Truth In This Repo

- Shared Panda configuration starts in `packages/design-system/panda.shared.ts`.
- Preset-level theme extensions and recipes are exported from `packages/design-system/src/panda-preset.ts`.
- Preview package codegen depends on the shared config; keep token and recipe shape aligned between shared and preset files.

## Styling Rules

- Prefer semantic tokens (`surface`, `text`, `border`, `interactive`) over raw color values.
- For repeated component styling, create or update recipes in `packages/design-system/src/recipes/` rather than ad-hoc style objects.
- For multi-part Ark components, prefer slot recipes for root/control/thumb/label style coordination.
- Keep variant names and intent consistent with existing recipe conventions (for example `size`, `tone`, `state`, `variant`).

## Implementation Checklist

1. Confirm whether styling belongs in:
   - a one-off local style
   - a recipe
   - a slot recipe
2. Reuse semantic tokens before introducing new tokens.
3. If new tokens are required, add them in both shared and preset config layers when needed for parity.
4. Keep recipe APIs stable where possible to avoid preview and downstream regressions.

## Working With Ark UI

- Favor `asChild` composition when integrating with custom triggers and controls.
- Align Ark state data attributes with style selectors for hover, checked, disabled, invalid, focus-visible, and open/closed states.
- For accessible controls (switch, checkbox, radio), ensure hidden inputs and labels are wired correctly before styling polish.

## Verification

- If component visuals changed in preview stories, run snapshot refresh and verification flows.
- Treat small switch visual drift as possible snapshot baseline variance before broad rewrites.
