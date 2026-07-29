import type { CSSProperties } from 'react';

import type { DataTableColumnAlign, DataTableDensity } from './types';

type HeaderCellStyleInput = {
  sortable: boolean;
  align?: DataTableColumnAlign;
  density?: DataTableDensity;
};

type BodyCellStyleInput = {
  align?: DataTableColumnAlign;
  density?: DataTableDensity;
};

type BodyRowStyleInput = {
  selected: boolean;
  clickable: boolean;
};

const HEADER_CELL_PADDING: Record<DataTableDensity, string> = {
  comfortable: '12px 16px',
  compact: '8px 12px',
};

const BODY_CELL_PADDING: Record<DataTableDensity, string> = {
  comfortable: '14px 16px',
  compact: '8px 12px',
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
    borderCollapse: 'collapse',
    background: 'var(--colors-surface-default, #ffffff)',
  } satisfies CSSProperties,
  headerRow: {
    background: 'var(--colors-surface-subtle, #f8f9fb)',
  } satisfies CSSProperties,
  headerCell: ({
    sortable,
    align = 'left',
    density = 'comfortable',
  }: HeaderCellStyleInput) =>
    ({
      padding: HEADER_CELL_PADDING[density],
      textAlign: align,
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
  bodyCell: ({
    align = 'left',
    density = 'comfortable',
  }: BodyCellStyleInput = {}) =>
    ({
      borderBottomWidth: 1,
      borderBottomStyle: 'solid',
      borderBottomColor: 'var(--colors-border-subtle, #d0d5dd)',
      padding: BODY_CELL_PADDING[density],
      textAlign: align,
    }) satisfies CSSProperties,
  magnitudeCell: {
    display: 'grid',
    gap: 8,
  } satisfies CSSProperties,
  magnitudeValue: {
    color: 'var(--colors-text-default, #101828)',
    fontSize: 14,
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } satisfies CSSProperties,
  magnitudeProgressRoot: {
    display: 'grid',
    width: 'min(16rem, 100%)',
    gridTemplateColumns: '1fr',
    gap: 4,
  } satisfies CSSProperties,
  magnitudeProgressTrack: {
    position: 'relative',
    width: '100%',
    height: 6,
    overflow: 'hidden',
    borderRadius: 999,
    background: 'var(--colors-surface-subtle, #eaecf0)',
  } satisfies CSSProperties,
  magnitudeProgressRange: {
    height: '100%',
    borderRadius: 999,
    background: 'var(--colors-interactive-primary, #3559e9)',
    transition: 'width 160ms ease',
  } satisfies CSSProperties,
  magnitudeValueText: {
    color: 'var(--colors-text-muted, #667085)',
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
    justifySelf: 'end',
  } satisfies CSSProperties,
};
