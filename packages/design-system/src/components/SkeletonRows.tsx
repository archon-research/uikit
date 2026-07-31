import { type CSSProperties } from 'react';

type SkeletonRowsProps = {
  rows?: number;
  columns?: number;
  firstColumnTall?: boolean;
  /** Applied to each skeleton `<tr>`. */
  className?: string;
  style?: CSSProperties;
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
  className,
  style,
}: SkeletonRowsProps = {}) {
  return Array.from({ length: rows }, (_row, rowIndex) => (
    <tr key={rowIndex} className={className} style={{ ...rowStyle, ...style }}>
      {Array.from({ length: columns }, (_cell, cellIndex) => (
        <td key={cellIndex} style={cellStyle} aria-hidden="true">
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
