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
