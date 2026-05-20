import { defineRecipe } from '@pandacss/dev';

export const sectionHeadingRecipe = defineRecipe({
  className: 'sectionHeading',
  description: 'Compact section heading for sidebar and panel labels.',
  base: {
    textStyle: 'sectionLabel',
    color: 'text.muted',
    mb: '2',
  },
  variants: {
    spacing: {
      normal: {},
      roomy: {
        mb: '3',
      },
    },
  },
  defaultVariants: {
    spacing: 'normal',
  },
});
