/**
 * Shared pulse animation for `SkeletonStack`/`SkeletonRows`. Kept as a plain
 * CSS string (injected via a local `<style>`, same approach as
 * `LoadingIndicator`'s spin keyframes) rather than a panda-preset keyframe:
 * these two components are inline-styled and must still render a sensible
 * static placeholder for consumers who haven't installed the design-system
 * Panda preset, so the animation can't be their only source of truth for how
 * the block looks.
 */

/**
 * Resting opacity of every skeleton block, and the peak of the pulse — so an
 * animated skeleton is never brighter than a static (`animate={false}` or
 * reduced-motion) one.
 */
export const SKELETON_PULSE_PEAK_OPACITY = 0.85;

export const SKELETON_PULSE_KEYFRAMES = `@keyframes skeletonPulse { 0%, 100% { opacity: ${SKELETON_PULSE_PEAK_OPACITY}; } 50% { opacity: 0.45; } }`;

export const SKELETON_PULSE_ANIMATION =
  'skeletonPulse 1.5s ease-in-out infinite';

/**
 * Custom property a consumer can set to re-tone every skeleton block.
 *
 * The blocks themselves are inline-styled (see the note above), and an inline
 * `background` outranks any class a consumer could write — so the blocks only
 * ever *read* this property, never hardcode a colour. Declaring it anywhere
 * above the skeleton wins: a `className` (`css({ '--skeleton-fill': '…' })`),
 * the component's own `style` prop, or any ancestor, since custom properties
 * inherit.
 */
export const SKELETON_FILL_VAR = '--skeleton-fill';

/**
 * Default fill of every skeleton block, resolved in three steps: a consumer's
 * `--skeleton-fill`, then the `border.subtle` token, then a raw hex for
 * consumers who haven't installed the design-system Panda preset.
 *
 * `border.subtle` rather than a surface token, because a skeleton has to stay
 * visible on *any* ground a consumer builds from the system's own tokens. A
 * surface-toned fill is by definition the same colour as one of those grounds:
 * a `surface.subtle` panel (a standard recessed card) rendered a skeleton at
 * exactly its own background — a silently blank loading state. `border.subtle`
 * is claimed by no surface step, and sits clear of every one of them in both
 * themes (light: #d4d4d4 on #fff/#f5f5f5/#fafafa; dark: #404040 on
 * #171717/#262626/#0a0a0a).
 */
export const SKELETON_FILL = `var(${SKELETON_FILL_VAR}, var(--colors-border-subtle, #d4d4d4))`;
