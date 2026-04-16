import { defineSlotRecipe } from '@pandacss/dev';

export const relationTabsRecipe = defineSlotRecipe({
  className: 'relationTabs',
  description: 'Tabs layout for dependency/dependent relationship content.',
  slots: ['root', 'list', 'tab', 'panel', 'emptyState', 'loadingState'],
  base: {
    root: {
      display: 'flex',
      flexDirection: 'column',
      gap: '3',
    },
    list: {
      display: 'flex',
      gap: '2',
    },
    tab: {
      px: '2',
      py: '1',
      fontSize: 'sm',
      borderRadius: 'md',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'transparent',
      bg: 'transparent',
      color: 'text.muted',
      transitionDuration: 'fast',
      transitionProperty: 'background-color, color, border-color, box-shadow',
      _hover: {
        bg: 'interactive.hover',
        borderColor: 'border.default',
        color: 'text.default',
      },
      '&[data-active]': {
        bg: 'interactive.selected',
        color: 'text.default',
        borderColor: 'transparent',
      },
    },
    panel: {
      minHeight: '3rem',
    },
    emptyState: {
      color: 'text.muted',
      textStyle: 'bodySm',
    },
    loadingState: {
      color: 'text.muted',
      textStyle: 'bodySm',
    },
  },
});
