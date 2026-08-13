import { defineRecipe } from '@pandacss/dev';

/**
 * Public flash-on-change recipe: the same two-phase tint (`hold` then an
 * independently-timed `fade`) that `DataTable`'s `flashOnUpdate="two-phase"`
 * uses, but reachable for any value that is not a table cell. Each `tone` sets
 * the generic `--data-table-flash-color` custom property the shared
 * `flashHold`/`flashFade` keyframes read, then applies the
 * `dataTableFlashTwoPhase` animation token — so this and the table flash can
 * never drift.
 *
 * Under `prefers-reduced-motion` the animation is suppressed; `FlashOnChange`
 * substitutes a discrete, non-animated marker on a matching timer instead, so
 * reduced-motion users still get a signal rather than nothing.
 *
 * Applied by its stable class names (`flash`, `flash--tone_x`). Registered in
 * the preset + staticCss.
 */
export const flashRecipe = defineRecipe({
  className: 'flash',
  description:
    'Two-phase flash-on-change tint for non-table values. tone selects the tint color; suppressed under prefers-reduced-motion (FlashOnChange shows a discrete marker instead).',
  base: {
    display: 'inline-block',
    borderRadius: 'sm',
  },
  variants: {
    tone: {
      neutral: {
        '--data-table-flash-color': 'var(--colors-interactive-selected)',
        animation: 'dataTableFlashTwoPhase',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      },
      positive: {
        '--data-table-flash-color': 'var(--colors-bg-success)',
        animation: 'dataTableFlashTwoPhase',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      },
      critical: {
        '--data-table-flash-color': 'var(--colors-bg-critical)',
        animation: 'dataTableFlashTwoPhase',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      },
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});
