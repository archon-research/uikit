import { LoaderCircle } from 'lucide-react';
import { type CSSProperties } from 'react';

type LoadingIndicatorProps = {
  message: string;
  className?: string;
  style?: CSSProperties;
};

const wrapperStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
  lineHeight: 1.6,
  color: 'var(--colors-text-muted, #667085)',
};

const spinnerStyle: CSSProperties = {
  display: 'block',
  flexShrink: 0,
  animation: 'spin 1s linear infinite',
};

const spinKeyframes = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

function SpinnerIcon() {
  return (
    <>
      <style>{spinKeyframes}</style>
      <LoaderCircle
        aria-hidden="true"
        size={14}
        strokeWidth={2}
        style={spinnerStyle}
        absoluteStrokeWidth
      />
    </>
  );
}

export function LoadingIndicator({
  message,
  className,
  style,
}: LoadingIndicatorProps) {
  return (
    <p className={className} style={{ ...wrapperStyle, ...style }}>
      <SpinnerIcon />
      <span>{message}</span>
    </p>
  );
}
