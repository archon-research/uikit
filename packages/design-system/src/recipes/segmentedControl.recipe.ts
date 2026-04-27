import { defineSlotRecipe } from '@pandacss/dev';

export const segmentedControlRecipe = defineSlotRecipe({
  className: 'segmentedControl',
  description: 'Segmented toggle control for compact mode/tab switching.',
  slots: ['group', 'item'],
  base: {
    group: {
      alignItems: 'center',
      bg: 'transparent',
      borderColor: 'border.default',
      borderRadius: 'sm',
      borderStyle: 'solid',
      borderWidth: '1px',
      display: 'inline-flex',
      gap: '0.5',
      p: '0.5',
    },
    item: {
      '&[data-pressed]': {
        bg: 'interactive.selected',
        color: 'text.default',
      },
      _hover: {
        bg: 'interactive.hover',
        color: 'text.default',
      },
      borderRadius: 'xs',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'text.muted',
      cursor: 'pointer',
      fontSize: 'sm',
      lineHeight: 'normal',
      h: '7',
      px: '3',
      py: '1',
      transitionDuration: 'fast',
      transitionProperty: 'background-color, color, border-color, box-shadow',
    },
  },
});
