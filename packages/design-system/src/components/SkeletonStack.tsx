import { type CSSProperties } from 'react';

type SkeletonStackProps = {
  count?: number;
  itemHeight?: number;
};

const wrapperStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
};

export function SkeletonStack({
  count = 6,
  itemHeight = 64,
}: SkeletonStackProps = {}) {
  return (
    <div style={wrapperStyle}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          style={{
            height: itemHeight,
            borderRadius: 8,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'var(--colors-border-subtle, #d0d5dd)',
            background: 'var(--colors-surface-subtle, #f8f9fb)',
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  );
}
