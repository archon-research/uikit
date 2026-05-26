---
name: uikit-live
description: Lightweight live UI iteration workflow for in-situ element selection, annotation capture, and side-by-side variant exploration without external screenshot tools.
---

# UIKit Live

Use this skill for fast, in-situ UI improvement loops on consumer apps while staying within UIKit and token constraints.

## Purpose and Constraints

- Improve real interface contexts, not isolated mockups.
- Keep loops lightweight: small, testable changes with clear accept/discard decisions.
- Stay aligned with semantic tokens and existing component recipes.

## In-Situ Flow

1. Select a specific element or region in the running UI.
2. Capture concise annotations about what is wrong and what should improve.
3. Generate 2 to 3 targeted variants for the same element in-place.
4. Present options side-by-side or sequentially with clear tradeoffs.
5. Accept one option or discard all, then iterate once if needed.

## Token and Component Guardrails

- Use existing semantic tokens first; avoid hardcoded style values.
- Prefer existing UIKit components, recipes, and slot recipes.
- Avoid visual drift that breaks established system language.
- Keep modifications composable and easy to port into source code.

## Parameter Knobs

Use at most 0 to 3 knobs per variant:

- Density: compact to regular spacing and touch targets.
- Color emphasis: subdued to strong semantic emphasis.
- Typography scale: conservative to expressive hierarchy shifts.

Keep knobs explicit so reviewers can compare options quickly.

## Acceptance Checklist

- Accessibility basics hold (focus, contrast, labeling, keyboard paths).
- Responsive behavior remains stable at expected breakpoints.
- Token integrity is preserved with no ad hoc values.
- Chosen variant improves clarity or task completion measurably.
