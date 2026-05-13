import React, { Component, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--colors-surface-subtle, #f8f9fb)',
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 512,
              borderRadius: 12,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'var(--colors-border-subtle, #d0d5dd)',
              background: 'var(--colors-surface-default, #ffffff)',
              padding: 24,
              boxShadow: '0 24px 80px rgba(15, 23, 42, 0.08)',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 600,
                color: 'var(--colors-text-strong, #111827)',
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: 12,
                fontSize: 14,
                color: 'var(--colors-text-muted, #667085)',
                lineHeight: 1.6,
              }}
            >
              The application encountered an unexpected error. This has been
              logged and will be investigated.
            </p>
            {this.state.error.message ? (
              <div
                style={{
                  marginTop: 16,
                  borderRadius: 8,
                  background: 'var(--colors-surface-subtle, #f8f9fb)',
                  padding: 12,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    color: 'var(--colors-text-muted, #667085)',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.message}
                </p>
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  borderRadius: 8,
                  background: 'var(--colors-interactive-accent, #2563eb)',
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                Reload page
              </button>
              <button
                type="button"
                onClick={this.resetError}
                style={{
                  flex: 1,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: 'var(--colors-border-subtle, #d0d5dd)',
                  background: 'var(--colors-surface-default, #ffffff)',
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--colors-text-strong, #111827)',
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
