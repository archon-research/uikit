---
name: ark-ui-guidance
description: WHEN implementing or reviewing Ark UI components in React; focus on composition, state attributes, forms integration, and collection/tree primitives.
---

# Ark UI Guidance

Use this skill for component architecture and behavior decisions around Ark UI primitives.

## Priorities

- Composition patterns that keep semantics and accessibility intact.
- Styling through stateful data attributes instead of brittle DOM assumptions.
- Correct forms wiring and validation feedback.
- Correct collection and tree usage for list-like and hierarchical interactions.

## Composition

- Prefer part-based composition (`Root`, `Trigger`, `Content`, `Item`) and avoid skipping required structural parts.
- Use `asChild` where custom elements are needed, while preserving Ark behavior and keyboard semantics.
- Keep trigger/content ownership clear for overlays (dialog, popover, menu, tooltip).

## Component State

- Style and behavior should key off Ark data attributes and ARIA state.
- Ensure focus-visible, disabled, invalid, expanded/open, selected/checked states are represented in both style and interaction logic.
- Avoid hand-managed state that duplicates Ark internal state unless there is explicit business logic coupling.

## Forms

- For form controls, ensure hidden input synchronization when provided by Ark patterns.
- Keep labels, descriptions, and error text associated through proper ids/aria attributes.
- Surface invalid state consistently in style and message copy.

## Collections And Tree Patterns

- Use list collection primitives for filterable/selectable list experiences.
- Use tree collection primitives for nested navigation, disclosure, and hierarchical selection.
- Keep item identity stable across renders to avoid focus and selection bugs.

## Verification Hints

- Validate keyboard flows first (tab, arrow keys, enter/space, escape).
- Validate screen reader naming for triggers and inputs.
- Validate interactions in both default and dense content states.
