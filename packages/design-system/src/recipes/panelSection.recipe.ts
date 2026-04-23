import { defineRecipe } from '@pandacss/dev';

export const panelSectionRecipe = defineRecipe({
  className: 'panelSection',
  description: 'Reusable panel section block with border and spacing presets.',
  base: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'border.subtle',
    borderRadius: 'md',
    bg: 'surface.subtle',
  },
  variants: {
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
    density: 'normal',
  },
});
