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
 * `--skeleton-fill`, then the `border.subtle` token, then a theme-aware raw
 * colour for consumers the token never reaches.
 *
 * `border.subtle` rather than a surface token, because a skeleton has to stay
 * visible on *any* ground a consumer builds from the system's own tokens. A
 * surface-toned fill is by definition the same colour as one of those grounds:
 * a `surface.subtle` panel (a standard recessed card) rendered a skeleton at
 * exactly its own background — a silently blank loading state. `border.subtle`
 * is claimed by no surface step, and reads as visibly distinct from every one
 * of them in both themes (light: #d4d4d4 on #fff/#f5f5f5/#fafafa; dark:
 * #404040 on #171717/#262626/#0a0a0a).
 *
 * "Visibly distinct" is the honest ceiling of that claim, not "high contrast".
 * Every block renders at {@link SKELETON_PULSE_PEAK_OPACITY} and dips to 0.45
 * mid-pulse, so the fill is always composited *toward* the ground it sits on:
 * against the tightest pairing (light `surface.subtle`) the separation is only
 * ~1.30:1 at rest and ~1.14:1 at the pulse trough. That reads as a placeholder
 * block, and is nowhere near a text-contrast threshold — which is the right
 * bar here, since these blocks carry no content (`SkeletonRows` marks its
 * cells `aria-hidden`). `SkeletonStack.test.ts` pins the rest-state numbers as
 * a regression ratchet.
 *
 * LAST-RESORT TIER: `light-dark(#d4d4d4, #404040)` is the pair of
 * `border.subtle` values above spelled literally, and applies ONLY when
 * `--colors-border-subtle` is undeclared — i.e. the design-system tokens never
 * reached this element. Two ways that happens: the consumer hasn't installed
 * the Panda preset at all, or they set Panda's `prefix` (`prefix.cssVar`),
 * which renames every generated variable so the middle tier silently misses.
 * This tier was a bare `#d4d4d4` before, which put a light-grey block on such
 * a consumer's dark surface.
 *
 * `light-dark()` resolves against the used value of `color-scheme`, which the
 * preset's own `globalCss` sets — but the preset is by definition absent in
 * this tier, so it only follows the dark theme for a consumer who declares
 * `color-scheme` themselves. Under `color-scheme: normal` (the CSS default) it
 * resolves to the light value, exactly as the old bare hex did.
 *
 * NOT GUARDED BY THIS CHAIN: setting `--skeleton-fill` to an empty or
 * otherwise invalid value. A `var()` whose property is *declared* substitutes
 * that value and never consults a fallback, so `background` becomes invalid at
 * computed-value time and the block renders transparent. Only a valid colour
 * belongs in this property. `@property` registration cannot rescue that
 * either: an `initial-value` must be computationally independent, which
 * `light-dark()` is not, and a registered property is never *unset*, so
 * registering it would defeat the `--colors-border-subtle` tier above.
 */
export const SKELETON_FILL = `var(${SKELETON_FILL_VAR}, var(--colors-border-subtle, light-dark(#d4d4d4, #404040)))`;
