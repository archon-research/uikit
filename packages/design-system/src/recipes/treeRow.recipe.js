import { defineSlotRecipe } from '@pandacss/dev';

export const treeRowRecipe = defineSlotRecipe({
  className: 'treeRow',
  description: 'Layout primitives for identity sidebar tree rows: per-level indentation, connector lines, and guide rails.',
  slots: ['button', 'connector', 'rail', 'icon'],
  base: {
    connector: {
      position: 'absolute',
      top: '50%',
      height: '1px',
      width: '0.42rem',
      bg: 'border.subtle',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
    },
    rail: {
      position: 'absolute',
      top: '0',
      bottom: '0',
      width: '1px',
      bg: 'border.subtle',
      pointerEvents: 'none',
      marginLeft: '6px',
    },
    icon: {
      width: '7',
      height: '7',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'text.strong',
      lineHeight: '1',
      flexShrink: '0',
    },
  },
  variants: {
    level: {
      '1': {
        button: { paddingLeft: '0.15rem' },
        connector: { display: 'none' },
      },
      '2': {
        button: { paddingLeft: '1.25rem' },
        connector: { left: '0.58rem' },
      },
      '3': {
        button: { paddingLeft: '2.35rem' },
        connector: { left: '1.68rem' },
      },
      '4': {
        button: { paddingLeft: '3.45rem' },
        connector: { left: '2.78rem' },
      },
      '5': {
        button: { paddingLeft: '4.55rem' },
        connector: { left: '3.88rem' },
      },
    },
  },
  defaultVariants: {
    level: '1',
  },
});
