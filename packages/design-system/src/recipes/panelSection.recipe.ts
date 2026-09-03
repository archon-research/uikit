import { defineRecipe } from '@pandacss/dev';

export const panelSectionRecipe = defineRecipe({
  className: 'panelSection',
  description:
    'Reusable panel section block with border, surface, and spacing presets.',
  base: {
    borderWidth: 'hairline',
    borderStyle: 'solid',
    borderColor: 'border.subtle',
    borderRadius: 'md',
  },
  variants: {
    // Additive 3-step surface ramp. `recessed` reproduces the previous
    // hard-coded `bg: 'surface.subtle'` so the bare recipe stays non-breaking;
    // callers that want a raised container opt into `raised`/`canvas`.
    surface: {
      canvas: {
        bg: 'surface.canvas',
      },
      raised: {
        bg: 'surface.default',
      },
      recessed: {
        bg: 'surface.subtle',
      },
    },
    density: {
      compact: {
        p: '3',
      },
      normal: {
        p: '4',
      },
    },
  },
  defaultVariants: {
    surface: 'recessed',
    density: 'normal',
  },
});
