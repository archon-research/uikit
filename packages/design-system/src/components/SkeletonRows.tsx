import { type CSSProperties } from 'react';

type SkeletonRowsProps = {
  rows?: number;
  columns?: number;
  firstColumnTall?: boolean;
};

const rowStyle: CSSProperties = {
  borderBottomWidth: 1,
  borderBottomStyle: 'solid',
  borderBottomColor: 'var(--colors-border-subtle, #d0d5dd)',
};

const cellStyle: CSSProperties = {
  padding: '14px 16px',
};

const blockBaseStyle: CSSProperties = {
  borderRadius: 6,
  background: 'var(--colors-surface-subtle, #f8f9fb)',
  opacity: 0.85,
};

export function SkeletonRows({
  rows = 6,
  columns = 6,
  firstColumnTall = true,
}: SkeletonRowsProps = {}) {
  return Array.from({ length: rows }, (_row, rowIndex) => (
    <tr key={rowIndex} style={rowStyle}>
      {Array.from({ length: columns }, (_cell, cellIndex) => (
        <td key={cellIndex} style={cellStyle}>
          <div
            style={{
              ...blockBaseStyle,
              height: cellIndex === 0 && firstColumnTall ? 48 : 32,
            }}
          />
        </td>
      ))}
    </tr>
  ));
}
