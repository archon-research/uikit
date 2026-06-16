import { LoaderCircle } from 'lucide-react';
import { type CSSProperties } from 'react';

type LoadingIndicatorProps = {
  message: string;
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
      />
    </>
  );
}

export function LoadingIndicator({ message }: LoadingIndicatorProps) {
  return (
    <p style={wrapperStyle}>
      <SpinnerIcon />
      <span>{message}</span>
    </p>
  );
}
