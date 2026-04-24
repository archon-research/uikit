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
      <svg
        aria-hidden="true"
        fill="none"
        height={14}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        style={spinnerStyle}
        viewBox="0 0 24 24"
        width={14}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
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
