type ErrorStateProps = {
  title: string;
  description: string;
  errorMessage?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

const rootStyle = {
  borderRadius: 8,
  borderWidth: 1,
  borderStyle: "solid" as const,
  borderColor: "var(--colors-border-default, #c2c8d1)",
  background: "var(--colors-surface-subtle, #f8f9fb)",
  maxWidth: 640,
  marginInline: "auto",
};

const titleStyle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 600,
  color: "var(--colors-text-strong, #111827)",
};

const bodyStyle = {
  margin: 0,
  marginTop: 8,
  fontSize: 14,
  color: "var(--colors-text-muted, #667085)",
  lineHeight: 1.6,
};

export function ErrorState({
  title,
  description,
  errorMessage,
  onRetry,
  retryLabel = "Try again",
}: ErrorStateProps) {
  return (
    <div style={{ ...rootStyle, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: 28,
            height: 28,
            borderRadius: 9999,
            background: "var(--colors-surface-default, #ffffff)",
            color: "var(--colors-text-muted, #667085)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              transform: "translateY(1px)",
            }}
          >
            <span
              style={{
                width: 2,
                height: 7,
                borderRadius: 9999,
                background: "currentColor",
              }}
            />
            <span
              style={{
                width: 2,
                height: 2,
                borderRadius: 9999,
                background: "currentColor",
              }}
            />
          </span>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={titleStyle}>{title}</h3>
          <p style={bodyStyle}>{description}</p>
          {errorMessage ? (
            <div
              style={{
                borderRadius: 8,
                background: "var(--colors-surface-default, #ffffff)",
                padding: 12,
                marginTop: 12,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  color: "var(--colors-text-muted, #667085)",
                  wordBreak: "break-word",
                }}
              >
                {errorMessage}
              </p>
            </div>
          ) : null}
          {onRetry ? (
            <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 8 }}>
              <button
                type="button"
                onClick={onRetry}
                style={{
                  borderRadius: 8,
                  background: "var(--colors-interactive-accent, #2563eb)",
                  padding: "8px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#ffffff",
                  cursor: "pointer",
                  border: "none",
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
