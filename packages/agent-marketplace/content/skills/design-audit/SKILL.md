---
name: design-audit
description: Lightweight UI audit for UIKit-based apps focusing on design-token discipline, component-library correctness, functional UX quality, and practical remediation.
---

# UIKit Design Audit

Use this skill to run quick, repeatable audits on UIKit-based consumer app screens before implementation churn.

## Scope

- Token-first: prioritize semantic token correctness over one-off values.
- Component-library-respecting: prefer improving usage of existing UIKit components and recipes.
- Lightweight and durable: keep audits practical, consistent, and easy to rerun.

## Audit Dimensions

1. Theming and tokens: detect hardcoded colors, spacing, radii, typography, or shadows that bypass semantic tokens.
2. Component composition and state: verify UIKit primitives, slots, and state variants are used correctly.
3. Functional UX flows: check affordances, feedback states, error handling, and interaction continuity.
4. Accessibility basics: validate focus visibility, contrast basics, labels, and keyboard reachability.
5. Responsive sanity: confirm behavior across representative breakpoints and density constraints.
6. Iconography consistency: enforce `lucide-react` usage and flag emoji or inline SVG icon drift.

## Severity Rubric

- P0: Blocking regression or severe accessibility/functionality break.
- P1: High-impact quality issue likely to affect user confidence or task completion.
- P2: Moderate inconsistency or maintainability concern.
- P3: Minor polish opportunity with low risk.

## Output Format

Produce:

1. Scorecard by dimension (pass/warn/fail with short rationale).
2. Prioritized fix list grouped by P0 to P3.
3. Recommended implementation path that preserves token and component consistency.

## Follow-up

- Use `live` to iterate in situ on the highest-priority findings.
- After fixes, run a polish pass for spacing, typography rhythm, and state consistency.
- Re-audit the same screen to verify token integrity and functional improvements.

## Icon policy guardrail

- Use Lucide icons from `lucide-react` across stories and component surfaces.
- Treat emoji icons and custom inline SVG icon drawings as design-system violations unless explicitly required for charts/illustrations.
