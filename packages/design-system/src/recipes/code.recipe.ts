import { defineRecipe } from '@pandacss/dev';

/**
 * Monospace code surface built over the `codeBlock` textStyle. `inline`
 * renders a padded chip sized relative to its surrounding prose (`0.9em`),
 * while `block` keeps the absolute `codeBlock` step and renders a scrollable
 * pre. The block variant resets a nested `<code>` back to inherit so
 * `<pre><code>` renders as one type ramp.
 */
export const codeRecipe = defineRecipe({
  className: 'code',
  description:
    'Monospace code surface over the codeBlock textStyle, with inline chip and scrollable block variants.',
  base: {
    textStyle: 'codeBlock',
    bg: 'surface.subtle',
    color: 'text.default',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'border.subtle',
  },
  variants: {
    variant: {
      inline: {
        display: 'inline',
        borderRadius: 'sm',
        px: '1',
        py: '0.5',
        // Size relative to surrounding prose rather than the absolute
        // `codeBlock` step, so inline code tracks the text it sits in.
        fontSize: '0.9em',
      },
      block: {
        display: 'block',
        borderRadius: 'md',
        p: '3',
        overflowX: 'auto',
        whiteSpace: 'pre',
        '& code': {
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
        },
      },
    },
  },
  defaultVariants: {
    variant: 'inline',
  },
});
