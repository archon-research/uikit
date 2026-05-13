import type { CSSProperties } from 'react';

type HeaderCellStyleInput = {
  sortable: boolean;
};

type BodyRowStyleInput = {
  selected: boolean;
  clickable: boolean;
};

export const dataTableRecipes = {
  wrapper: {
    overflowX: 'auto',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--colors-border-subtle, #d0d5dd)',
  } satisfies CSSProperties,
  table: {
    width: '100%',
    minWidth: '48rem',
    borderCollapse: 'collapse',
    background: 'var(--colors-surface-default, #ffffff)',
  } satisfies CSSProperties,
  headerRow: {
    background: 'var(--colors-surface-subtle, #f8f9fb)',
  } satisfies CSSProperties,
  headerCell: ({ sortable }: HeaderCellStyleInput) =>
    ({
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--colors-text-muted, #667085)',
      cursor: sortable ? 'pointer' : 'default',
    }) satisfies CSSProperties,
  headerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: 'none',
    background: 'transparent',
    padding: 0,
    font: 'inherit',
    color: 'inherit',
    cursor: 'pointer',
  } satisfies CSSProperties,
  bodyRow: ({ selected, clickable }: BodyRowStyleInput) =>
    ({
      cursor: clickable ? 'pointer' : 'default',
      background: selected
        ? 'var(--colors-interactive-selected, #e8eefc)'
        : 'var(--colors-surface-default, #ffffff)',
      transition: 'background-color 120ms ease',
    }) satisfies CSSProperties,
  bodyCell: {
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'var(--colors-border-subtle, #d0d5dd)',
    padding: '14px 16px',
  } satisfies CSSProperties,
};
