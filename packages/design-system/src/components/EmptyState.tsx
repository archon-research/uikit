import { type ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  size?: "default" | "compact";
  stretch?: boolean;
};

const rootStyle = {
  display: "grid",
  justifyItems: "center",
  textAlign: "center" as const,
  borderRadius: 8,
  borderWidth: 1,
  borderStyle: "solid" as const,
  borderColor: "var(--colors-border-subtle, #d0d5dd)",
  background: "var(--colors-surface-subtle, #f8f9fb)",
};

const iconWrapStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 9999,
  background: "var(--colors-surface-default, #ffffff)",
  color: "var(--colors-text-muted, #667085)",
};

const titleStyle = {
  margin: 0,
  color: "var(--colors-text-strong, #111827)",
  fontWeight: 600,
};

const bodyStyle = {
  margin: 0,
  color: "var(--colors-text-muted, #667085)",
  lineHeight: 1.6,
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  size = "default",
  stretch = false,
}: EmptyStateProps) {
  const isCompact = size === "compact";

  return (
    <div
      style={{
        ...rootStyle,
        gap: isCompact ? 10 : 12,
        padding: isCompact ? 20 : 32,
        width: stretch ? "100%" : undefined,
        maxWidth: stretch ? undefined : 512,
        marginInline: stretch ? undefined : "auto",
      }}
    >
      <div
        style={{
          ...iconWrapStyle,
          width: isCompact ? 40 : 48,
          height: isCompact ? 40 : 48,
          fontSize: isCompact ? 16 : 18,
        }}
      >
        {icon ?? "○"}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <h3
          style={{
            ...titleStyle,
            fontSize: isCompact ? 16 : 18,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            ...bodyStyle,
            fontSize: isCompact ? 12 : 14,
          }}
        >
          {description}
        </p>
      </div>
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}
