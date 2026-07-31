import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Faceted multi-select filter: a bordered checklist with per-value row
 * counts. Deliberately an always-visible list rather than a
 * popover/dropdown — the design system has no Popover primitive yet, so this
 * stays composable inside a filter bar without depending on one.
 */
export const facetedMultiSelectRecipe = defineSlotRecipe({
  className: 'facetedMultiSelect',
  description:
    'Faceted multi-select filter: checklist of field values with row counts. Always-visible list, no popover dependency.',
  slots: [
    'root',
    'header',
    'title',
    'clear',
    'list',
    'item',
    'checkbox',
    'itemLabel',
    'count',
    'empty',
  ],
  base: {
    root: {
      display: 'grid',
      gap: '2',
      border: 'none',
      padding: '0',
      margin: '0',
      minInlineSize: '0',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '2',
    },
    title: {
      fontSize: 'xs',
      fontWeight: 'medium',
      letterSpacing: 'wide',
      color: 'text.muted',
      padding: '0',
    },
    clear: {
      border: 'none',
      background: 'none',
      padding: '0',
      fontSize: '2xs',
      fontWeight: 'medium',
      color: 'text.interactive',
      cursor: 'pointer',
      _hover: { textDecoration: 'underline' },
    },
    list: {
      display: 'grid',
      gap: '0.5',
      listStyle: 'none',
      margin: '0',
      padding: '0',
      maxHeight: '48',
      overflowY: 'auto',
    },
    item: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '2',
      borderRadius: 'md',
      px: '1.5',
      py: '1',
      _hover: { bg: 'interactive.hover' },
    },
    itemLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '2',
      fontSize: 'sm',
      color: 'text.default',
      cursor: 'pointer',
      minWidth: '0',
    },
    checkbox: {
      width: '3.5',
      height: '3.5',
      accentColor: 'interactive.accent',
      cursor: 'pointer',
      flexShrink: '0',
    },
    count: {
      fontSize: 'xs',
      fontFamily: 'mono',
      color: 'text.muted',
      flexShrink: '0',
    },
    empty: {
      fontSize: 'sm',
      color: 'text.muted',
      margin: '0',
    },
  },
});
