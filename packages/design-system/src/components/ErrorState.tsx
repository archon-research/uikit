import { CircleAlert } from 'lucide-react';
import { type CSSProperties } from 'react';

type ErrorStateProps = {
  title: string;
  description: string;
  errorMessage?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  /**
   * `page` (default) is the centred, max-width page-level treatment. `inline`
   * is a compact, left-aligned, full-width treatment for a narrow rail or an
   * inline slot: smaller icon/title, no max-width, tighter padding.
   */
  size?: 'page' | 'inline';
  /**
   * `neutral` (default) reads as a quiet empty/error surface. `critical` recolors
   * the frame, icon, and title with the dark-aware `bg.critical`/`text.critical`
   * tokens so a genuine failure reads as one — the title color lives inline, so
   * `className` alone cannot achieve this.
   */
  tone?: 'neutral' | 'critical';
  /** Merged onto the root after the defaults, so it can override `maxWidth`. */
  style?: CSSProperties;
};

const rootStyle = {
  borderRadius: 8,
  borderWidth: 1,
  borderStyle: 'solid' as const,
};

const bodyStyle = {
  margin: 0,
  marginTop: 8,
  fontSize: 14,
  color: 'var(--colors-text-muted, #667085)',
  lineHeight: 1.6,
};

export function ErrorState({
  title,
  description,
  errorMessage,
  onRetry,
  retryLabel = 'Try again',
  className,
  size = 'page',
  tone = 'neutral',
  style,
}: ErrorStateProps) {
  const inline = size === 'inline';
  const critical = tone === 'critical';
  const accentColor = critical
    ? 'var(--colors-text-critical, #dc2626)'
    : undefined;

  return (
    <div
      className={className}
      style={{
        ...rootStyle,
        borderColor: critical
          ? 'var(--colors-text-critical, #dc2626)'
          : 'var(--colors-border-default, #c2c8d1)',
        background: critical
          ? 'var(--colors-bg-critical, #fef2f2)'
          : 'var(--colors-surface-subtle, #f8f9fb)',
        padding: inline ? 16 : 24,
        maxWidth: inline ? undefined : 840,
        marginInline: inline ? undefined : 'auto',
        ...style,
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: inline ? 10 : 14,
          justifyItems: inline ? 'start' : 'center',
          textAlign: inline ? 'left' : 'center',
        }}
      >
        <div
          style={{
            display: 'inline-grid',
            placeItems: 'center',
            width: inline ? 32 : 44,
            height: inline ? 32 : 44,
            borderRadius: 9999,
            background: 'var(--colors-surface-default, #ffffff)',
            color: accentColor ?? 'var(--colors-text-muted, #667085)',
          }}
          aria-hidden="true"
        >
          <CircleAlert
            size={inline ? 18 : 24}
            strokeWidth={1.9}
            absoluteStrokeWidth
          />
        </div>
        <div
          style={{
            minWidth: 0,
            width: '100%',
            maxWidth: inline ? '100%' : 720,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: inline ? 15 : 18,
              fontWeight: 600,
              color: accentColor ?? 'var(--colors-text-strong, #111827)',
            }}
          >
            {title}
          </h3>
          <p style={bodyStyle}>{description}</p>
          {errorMessage ? (
            <div
              style={{
                borderRadius: 8,
                background: 'var(--colors-surface-default, #ffffff)',
                padding: 12,
                marginTop: 12,
                textAlign: 'left',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  color: 'var(--colors-text-muted, #667085)',
                  // Wrap long messages (URLs, status codes) instead of forcing a
                  // horizontal scroll strip, which a narrow rail cannot absorb.
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                }}
              >
                {errorMessage}
              </p>
            </div>
          ) : null}
          {onRetry ? (
            <div
              style={{
                display: 'flex',
                justifyContent: inline ? 'flex-start' : 'center',
                marginTop: 8,
              }}
            >
              <button
                type="button"
                onClick={onRetry}
                style={{
                  borderRadius: 8,
                  background: 'var(--colors-interactive-accent, #2563eb)',
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                {retryLabel}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
