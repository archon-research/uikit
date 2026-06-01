---
name: live
description: Lightweight live UI iteration workflow for in-situ element selection, annotation capture, and side-by-side variant exploration in real app contexts.
---

# Live

Use this skill for fast, in-situ UI improvement loops on consumer apps while staying within UIKit and token constraints.

## Purpose and Constraints

- Improve real interface contexts, not isolated mockups.
- Keep loops lightweight: small, testable changes with clear accept/discard decisions.
- Stay aligned with semantic tokens and existing component recipes.

## Preconditions

Before iterating, confirm all of the following:

1. A dev server with HMR is running for the target app (for this stream the default is `http://localhost:5173`).
2. You are editing source files, not generated assets.
3. The target screen is reachable and stable enough for repeated checks.
4. The workflow stays tool-agnostic: Claude and Copilot paths are both valid as long as the same source files are updated.
5. If present, read `DESIGN.md` and `PREVIEW.md` first; they override ad hoc local style guesses.

## In-Situ Flow

1. Select a specific element or region in the running UI.
2. Capture concise annotations about what is wrong and what should improve.
3. Generate 2 to 3 targeted variants for the same element in-place.
4. Present options side-by-side or sequentially with clear tradeoffs.
5. Accept one option or discard all, then iterate once if needed.

When a variant is accepted:

1. Write the accepted changes into source immediately.
2. Remove temporary experiment scaffolding.
3. Re-open the same screen and verify no regressions before continuing.

When all variants are rejected:

1. Keep original source unchanged.
2. Re-state the constraint that blocked acceptance.
3. Run one additional focused iteration only if the blocker is clear.

## Token and Component Guardrails

- Use existing semantic tokens first; avoid hardcoded style values.
- Prefer existing UIKit components, recipes, and slot recipes.
- Avoid visual drift that breaks established system language.
- Keep modifications composable and easy to port into source code.

## Design-System Defaults

Apply these defaults unless the user asks for a deliberate exception:

- Segmented controls: make active state affordance explicit using `data-state="on"` and semantic tokens.
- Option controls (toggle/segmented/switch-like): maintain consistent border, focus ring, and interaction-state treatment.
- Data-table headers: enforce casing and tracking policy (`uppercase` plus letter-spacing where that pattern is expected).

## Component Contracts (Use Exactly)

When implementing option controls in this repository, use these concrete pairings:

1. Segmented options:
	- Component primitive: `ToggleGroup` from `@archon-research/design-system`.
	- Styling contract: `segmentedControl()` recipe from styled-system.
	- Required active selector: `&[data-state="on"]` (recipe already maps selected state).
	- Baseline tokens: `border.default`, `interactive.selected`, `interactive.hover`, `text.default`, `text.muted`.
2. Binary toggles:
	- Component primitive: `Switch` from `@archon-research/design-system`.
	- Styling contract: `toggleSwitch()` slot recipe.
	- Root defaults: `border.default`, `surface.subtle`, focus ring via `_focusVisible` rule.
3. Data-table headers:
	- Prefer shared `DataTable` contract first.
	- Header policy baseline: uppercase plus tracking (`letterSpacing`), muted header color, no ad hoc one-off casing in sibling tables.

Do not duplicate selectors that already exist in shared recipes unless there is a documented exception in `DESIGN.md`.

## Parameter Knobs

Use at most 0 to 3 knobs per variant:

- Density: compact to regular spacing and touch targets.
- Color emphasis: subdued to strong semantic emphasis.
- Typography scale: conservative to expressive hierarchy shifts.

Keep knobs explicit so reviewers can compare options quickly.

## Recovery

- If live iteration is interrupted, resume from the last accepted source state, not from transient preview changes.
- If the selected element lives in a generated file, route to the source-of-truth file before applying changes.
- If CSP or local script restrictions block iteration tooling, use a dev-only fix and remove or guard it before shipping.

## Context Preference Order

Choose defaults in this order:

1. `DESIGN.md` and `PREVIEW.md` (if present).
2. Shared design-system recipes/components.
3. Existing local screen usage patterns.
4. New local overrides (last resort, document why).

## Acceptance Checklist

- Accessibility basics hold (focus, contrast, labeling, keyboard paths).
- Responsive behavior remains stable at expected breakpoints.
- Token integrity is preserved with no ad hoc values.
- Chosen variant improves clarity or task completion measurably.
