import { type CSSProperties, type MouseEventHandler } from 'react';

type ResizeHandleProps = {
  axis: 'horizontal' | 'vertical';
  label: string;
  onMouseDown: MouseEventHandler<HTMLDivElement>;
  placement?: 'overlay' | 'block';
};

const baseStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 1,
  background: 'transparent',
};

const lineBaseStyle: CSSProperties = {
  position: 'absolute',
  background: 'var(--colors-border-subtle, #d0d5dd)',
  pointerEvents: 'none',
};

export function ResizeHandle({
  axis,
  label,
  onMouseDown,
  placement = axis === 'vertical' ? 'overlay' : 'block',
}: ResizeHandleProps) {
  const handleStyle: CSSProperties =
    axis === 'vertical'
      ? {
          ...baseStyle,
          top: 0,
          right: -4,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
        }
      : placement === 'overlay'
        ? {
            ...baseStyle,
            top: -4,
            left: 0,
            right: 0,
            height: 8,
            cursor: 'row-resize',
          }
      : {
          position: 'relative',
          flex: '0 0 auto',
          height: 8,
          cursor: 'row-resize',
          marginTop: -4,
          marginBottom: -4,
          zIndex: 1,
          background: 'transparent',
        };

  const lineStyle: CSSProperties =
    axis === 'vertical'
      ? {
          ...lineBaseStyle,
          top: 0,
          bottom: 0,
          left: '50%',
          width: 1,
          transform: 'translateX(-50%)',
        }
      : {
          ...lineBaseStyle,
          left: 0,
          right: 0,
          top: '50%',
          height: 1,
          transform: 'translateY(-50%)',
        };

  return (
    <div
      role="separator"
      aria-orientation={axis}
      aria-label={label}
      style={handleStyle}
      onMouseDown={onMouseDown}
    >
      <div aria-hidden="true" style={lineStyle} />
    </div>
  );
}
